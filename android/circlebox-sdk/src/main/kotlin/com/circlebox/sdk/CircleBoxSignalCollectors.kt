package com.circlebox.sdk

import android.Manifest
import android.content.BroadcastReceiver
import android.content.ComponentCallbacks2
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.res.Configuration
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import androidx.core.content.ContextCompat
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit

internal class CircleBoxSignalCollectors(
    private val context: Context,
    private val config: CircleBoxConfig,
    private val fileStore: CircleBoxFileStore,
    private val sink: (type: String, severity: CircleBoxEventSeverity, attrs: Map<String, String>, thread: CircleBoxEventThread) -> Unit
) {
    private val appContext = context.applicationContext
    private val powerManager = appContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
    private val connectivityManager = appContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

    private var thermalListener: PowerManager.OnThermalStatusChangedListener? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var lifecycleObserver: DefaultLifecycleObserver? = null
    private var batteryReceiver: BroadcastReceiver? = null
    private var memoryCallback: ComponentCallbacks2? = null
    private var jankMonitor: CircleBoxJankMonitor? = null

    private val scheduler = Executors.newSingleThreadScheduledExecutor { runnable ->
        Thread(runnable, "circlebox-disk-monitor").apply { isDaemon = true }
    }
    private var diskTask: ScheduledFuture<*>? = null

    private var lastConnectivity: String = "unknown"
    private var lastPermissions = readPermissionSnapshot()

    fun start() {
        // Register OS listeners in one place to keep startup deterministic.
        registerLifecycle()
        registerMemoryPressure()
        registerConnectivity()
        registerBattery()
        registerThermal()
        registerJank()
        registerDiskChecks()

        emitBatteryState()
        emitThermalState()
    }

    fun stop() {
        networkCallback?.let { callback ->
            runCatching { connectivityManager?.unregisterNetworkCallback(callback) }
        }
        networkCallback = null

        thermalListener?.let { listener ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                runCatching { powerManager?.removeThermalStatusListener(listener) }
            }
        }
        thermalListener = null

        lifecycleObserver?.let { observer ->
            ProcessLifecycleOwner.get().lifecycle.removeObserver(observer)
        }
        lifecycleObserver = null

        memoryCallback?.let { callback ->
            appContext.unregisterComponentCallbacks(callback)
        }
        memoryCallback = null

        batteryReceiver?.let { receiver ->
            runCatching { appContext.unregisterReceiver(receiver) }
        }
        batteryReceiver = null

        jankMonitor?.stop()
        jankMonitor = null

        diskTask?.cancel(true)
        diskTask = null
        // Runtime is single-start; collector does not restart after stop.
        scheduler.shutdownNow()
    }

    private fun registerLifecycle() {
        val observer = object : DefaultLifecycleObserver {
            override fun onStart(owner: LifecycleOwner) {
                sink("lifecycle", CircleBoxEventSeverity.INFO, mapOf("state" to "foreground"), CircleBoxEventThread.MAIN)
                detectPermissionChanges()
            }

            override fun onStop(owner: LifecycleOwner) {
                sink("lifecycle", CircleBoxEventSeverity.INFO, mapOf("state" to "background"), CircleBoxEventThread.MAIN)
            }
        }
        lifecycleObserver = observer
        ProcessLifecycleOwner.get().lifecycle.addObserver(observer)
    }

    private fun registerMemoryPressure() {
        val callback = object : ComponentCallbacks2 {
            override fun onConfigurationChanged(newConfig: Configuration) {
                // no-op
            }

            override fun onLowMemory() {
                sink(
                    "memory_pressure",
                    CircleBoxEventSeverity.WARN,
                    mapOf("source" to "onLowMemory"),
                    CircleBoxEventThread.MAIN
                )
            }

            override fun onTrimMemory(level: Int) {
                if (level >= ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW) {
                    sink(
                        "memory_pressure",
                        CircleBoxEventSeverity.WARN,
                        mapOf("source" to "onTrimMemory", "level" to level.toString()),
                        CircleBoxEventThread.MAIN
                    )
                }
            }
        }

        memoryCallback = callback
        appContext.registerComponentCallbacks(callback)
    }

    private fun registerConnectivity() {
        val cm = connectivityManager ?: return

        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                emitConnectivity()
            }

            override fun onLost(network: Network) {
                emitConnectivity()
            }

            override fun onCapabilitiesChanged(network: Network, networkCapabilities: NetworkCapabilities) {
                emitConnectivity()
            }
        }

        networkCallback = callback

        runCatching {
            cm.registerNetworkCallback(NetworkRequest.Builder().build(), callback)
        }.onFailure {
            // Some OEM ROMs reject broad callbacks; default callback is the fallback.
            runCatching {
                cm.registerDefaultNetworkCallback(callback)
            }
        }

        emitConnectivity()
    }

    private fun registerBattery() {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                emitBatteryState(intent)
            }
        }

        batteryReceiver = receiver

        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_BATTERY_CHANGED)
            addAction(PowerManager.ACTION_POWER_SAVE_MODE_CHANGED)
        }

        val stickyIntent = appContext.registerReceiver(receiver, filter)
        emitBatteryState(stickyIntent)
    }

    private fun registerThermal() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return
        }

        val listener = PowerManager.OnThermalStatusChangedListener { status ->
            sink(
                "thermal_state",
                CircleBoxEventSeverity.INFO,
                mapOf("state" to thermalStateToString(status)),
                CircleBoxEventThread.BACKGROUND
            )
        }
        thermalListener = listener
        powerManager?.addThermalStatusListener(listener)
    }

    private fun registerJank() {
        val monitor = CircleBoxJankMonitor(config.jankThresholdMs) { blockedMs ->
            sink(
                "thread_contention",
                CircleBoxEventSeverity.WARN,
                mapOf(
                    "blocked_ms" to blockedMs.toString(),
                    "threshold_ms" to config.jankThresholdMs.toString()
                ),
                CircleBoxEventThread.MAIN
            )
        }
        jankMonitor = monitor
        monitor.start()
    }

    private fun registerDiskChecks() {
        diskTask = scheduler.scheduleAtFixedRate(
            {
                val available = fileStore.availableDiskBytes()
                sink(
                    "disk_space",
                    CircleBoxEventSeverity.INFO,
                    mapOf("available_bytes" to available.toString()),
                    CircleBoxEventThread.BACKGROUND
                )
            },
            0L,
            config.diskCheckIntervalSec,
            TimeUnit.SECONDS
        )
    }

    private fun emitConnectivity() {
        val current = getConnectivityType()
        val previous = lastConnectivity
        lastConnectivity = current

        // Emit transitions instead of point-in-time values to retain narrative context.
        sink(
            "connectivity_transition",
            CircleBoxEventSeverity.INFO,
            mapOf("from" to previous, "to" to current),
            CircleBoxEventThread.BACKGROUND
        )
    }

    private fun getConnectivityType(): String {
        val cm = connectivityManager ?: return "unknown"
        val activeNetwork = cm.activeNetwork ?: return "none"
        val caps = cm.getNetworkCapabilities(activeNetwork) ?: return "none"

        return when {
            caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
            caps.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH) -> "bluetooth"
            else -> "other"
        }
    }

    private fun emitBatteryState(intent: Intent? = null) {
        val batteryIntent = intent ?: appContext.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = batteryIntent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = batteryIntent?.getIntExtra(BatteryManager.EXTRA_SCALE, 100) ?: 100

        val percent = if (level < 0 || scale <= 0) {
            -1
        } else {
            (level * 100) / scale
        }

        sink(
            "battery_health",
            CircleBoxEventSeverity.INFO,
            mapOf(
                "percent" to percent.toString(),
                "low_power_mode" to (powerManager?.isPowerSaveMode == true).toString()
            ),
            CircleBoxEventThread.BACKGROUND
        )
    }

    private fun emitThermalState() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            sink(
                "thermal_state",
                CircleBoxEventSeverity.INFO,
                mapOf("state" to "unsupported"),
                CircleBoxEventThread.BACKGROUND
            )
            return
        }

        val status = powerManager?.currentThermalStatus ?: PowerManager.THERMAL_STATUS_NONE
        sink(
            "thermal_state",
            CircleBoxEventSeverity.INFO,
            mapOf("state" to thermalStateToString(status)),
            CircleBoxEventThread.BACKGROUND
        )
    }

    private fun thermalStateToString(status: Int): String {
        return when (status) {
            PowerManager.THERMAL_STATUS_NONE -> "nominal"
            PowerManager.THERMAL_STATUS_LIGHT -> "fair"
            PowerManager.THERMAL_STATUS_MODERATE -> "serious"
            PowerManager.THERMAL_STATUS_SEVERE,
            PowerManager.THERMAL_STATUS_CRITICAL,
            PowerManager.THERMAL_STATUS_EMERGENCY,
            PowerManager.THERMAL_STATUS_SHUTDOWN -> "critical"
            else -> "unknown"
        }
    }

    private data class PermissionSnapshot(
        val location: String,
        val camera: String
    )

    private fun readPermissionSnapshot(): PermissionSnapshot {
        val location = if (ContextCompat.checkSelfPermission(appContext, Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            "granted"
        } else {
            "denied"
        }

        val camera = if (ContextCompat.checkSelfPermission(appContext, Manifest.permission.CAMERA) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            "granted"
        } else {
            "denied"
        }

        return PermissionSnapshot(location = location, camera = camera)
    }

    private fun detectPermissionChanges() {
        val current = readPermissionSnapshot()

        if (current.location != lastPermissions.location) {
            sink(
                "permission_change",
                CircleBoxEventSeverity.WARN,
                mapOf(
                    "permission" to "location",
                    "from" to lastPermissions.location,
                    "to" to current.location
                ),
                CircleBoxEventThread.MAIN
            )
        }

        if (current.camera != lastPermissions.camera) {
            sink(
                "permission_change",
                CircleBoxEventSeverity.WARN,
                mapOf(
                    "permission" to "camera",
                    "from" to lastPermissions.camera,
                    "to" to current.camera
                ),
                CircleBoxEventThread.MAIN
            )
        }

        lastPermissions = current
    }
}
