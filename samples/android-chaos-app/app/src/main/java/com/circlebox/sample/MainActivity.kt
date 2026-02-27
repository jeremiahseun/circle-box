package com.circlebox.sample

import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.circlebox.cloud.CircleBoxCloud
import com.circlebox.cloud.CircleBoxCloudConfig
import com.circlebox.cloud.CircleBoxCloudUsageMode
import com.circlebox.sdk.CircleBox
import com.circlebox.sdk.CircleBoxConfig
import com.circlebox.sdk.CircleBoxEvent

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        CircleBox.start(CircleBoxConfig(enableDebugViewer = true))
        startCloudIfConfigured()

        findViewById<Button>(R.id.btnThermal).setOnClickListener {
            CircleBox.breadcrumb("Mock thermal spike", mapOf("state" to "critical"))
        }

        findViewById<Button>(R.id.btnBattery).setOnClickListener {
            CircleBox.breadcrumb("Mock low battery", mapOf("percent" to "7", "low_power_mode" to "true"))
        }

        findViewById<Button>(R.id.btnNetwork).setOnClickListener {
            CircleBox.breadcrumb("Mock no internet", mapOf("to" to "none"))
        }

        findViewById<Button>(R.id.btnPermission).setOnClickListener {
            CircleBox.breadcrumb("Mock permission revoked", mapOf("permission" to "camera", "to" to "denied"))
        }

        findViewById<Button>(R.id.btnDisk).setOnClickListener {
            CircleBox.breadcrumb("Mock low disk", mapOf("available_bytes" to "1024"))
        }

        findViewById<Button>(R.id.btnBreadcrumb).setOnClickListener {
            CircleBox.breadcrumb("User started Checkout", mapOf("flow" to "checkout"))
        }

        findViewById<Button>(R.id.btnExport).setOnClickListener {
            val files = CircleBox.exportLogs()
            Toast.makeText(this, "Exported ${files.size} file(s)", Toast.LENGTH_SHORT).show()
        }

        findViewById<Button>(R.id.btnCloudFlush).setOnClickListener {
            try {
                val files = CircleBoxCloud.flush()
                Toast.makeText(this, "Uploaded ${files.size} file(s) to cloud", Toast.LENGTH_SHORT).show()
            } catch (error: IllegalStateException) {
                Toast.makeText(this, "Cloud flush failed: ${error.message}", Toast.LENGTH_SHORT).show()
            }
        }

        findViewById<Button>(R.id.btnViewer).setOnClickListener {
            openViewerDialog()
        }

        findViewById<Button>(R.id.btnCrash).setOnClickListener {
            val crash = 1 / 0
            Toast.makeText(this, crash.toString(), Toast.LENGTH_SHORT).show()
        }
    }

    override fun onResume() {
        super.onResume()
        if (CircleBox.hasPendingCrashReport()) {
            AlertDialog.Builder(this)
                .setTitle("Crash Report Found")
                .setMessage("A pending .circlebox report exists from previous crash. Export now?")
                .setPositiveButton("Export") { _, _ ->
                    val files = CircleBox.exportLogs()
                    Toast.makeText(this, "Exported ${files.size} file(s)", Toast.LENGTH_SHORT).show()
                }
                .setNegativeButton("Later", null)
                .show()
        }
    }

    private fun openViewerDialog() {
        val events = CircleBox.debugSnapshot(200)
        if (events.isEmpty()) {
            AlertDialog.Builder(this)
                .setTitle("CircleBox Viewer")
                .setMessage("No events captured (enableDebugViewer=false or empty buffer)")
                .setPositiveButton("Close", null)
                .show()
            return
        }

        val typeOptions = listOf("all") + events.map { event -> event.type }.distinct().sorted()
        selectTypeFilter(events, typeOptions)
    }

    private fun selectTypeFilter(events: List<CircleBoxEvent>, typeOptions: List<String>) {
        AlertDialog.Builder(this)
            .setTitle("Filter: Type")
            .setItems(typeOptions.toTypedArray()) { _, typeIndex ->
                selectSeverityFilter(events, typeOptions[typeIndex])
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun selectSeverityFilter(events: List<CircleBoxEvent>, typeFilter: String) {
        val severityOptions = arrayOf("all", "info", "warn", "error", "fatal")
        AlertDialog.Builder(this)
            .setTitle("Filter: Severity")
            .setItems(severityOptions) { _, severityIndex ->
                selectThreadFilter(events, typeFilter, severityOptions[severityIndex])
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun selectThreadFilter(
        events: List<CircleBoxEvent>,
        typeFilter: String,
        severityFilter: String
    ) {
        val threadOptions = arrayOf("all", "main", "background", "crash")
        AlertDialog.Builder(this)
            .setTitle("Filter: Thread")
            .setItems(threadOptions) { _, threadIndex ->
                val threadFilter = threadOptions[threadIndex]
                val filteredEvents = events.filter { event ->
                    val typeMatch = typeFilter == "all" || event.type == typeFilter
                    val severityMatch = severityFilter == "all" || event.severity.name.lowercase() == severityFilter
                    val threadMatch = threadFilter == "all" || event.thread.name.lowercase() == threadFilter
                    typeMatch && severityMatch && threadMatch
                }
                showFilteredViewer(
                    events = filteredEvents,
                    totalCount = events.size,
                    typeFilter = typeFilter,
                    severityFilter = severityFilter,
                    threadFilter = threadFilter
                )
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showFilteredViewer(
        events: List<CircleBoxEvent>,
        totalCount: Int,
        typeFilter: String,
        severityFilter: String,
        threadFilter: String
    ) {
        val title = "CircleBox Viewer (${events.size}/$totalCount)"
        val header = "type=$typeFilter severity=$severityFilter thread=$threadFilter"
        val body = if (events.isEmpty()) {
            "$header\n\nNo events match the selected filters."
        } else {
            "$header\n\n" + events.joinToString("\n") { event ->
                "#${event.seq} ${event.type} [${event.severity.name.lowercase()}] ${event.attrs}"
            }
        }

        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(body)
            .setPositiveButton("Close", null)
            .setNeutralButton("Adjust Filters") { _, _ ->
                openViewerDialog()
            }
            .show()
    }

    private fun startCloudIfConfigured() {
        val endpoint = BuildConfig.CIRCLEBOX_WORKER_BASE_URL.trim()
        val ingestKey = BuildConfig.CIRCLEBOX_INGEST_KEY.trim()
        if (endpoint.isEmpty() || ingestKey.isEmpty()) {
            return
        }

        val usageKey = BuildConfig.CIRCLEBOX_USAGE_KEY.trim().takeIf { it.isNotEmpty() }
        try {
            CircleBoxCloud.start(
                CircleBoxCloudConfig(
                    endpoint = endpoint,
                    ingestKey = ingestKey,
                    enableAutoFlush = true,
                    autoExportPendingOnStart = true,
                    enableUsageBeacon = usageKey != null,
                    usageBeaconKey = usageKey,
                    usageBeaconMode = CircleBoxCloudUsageMode.CORE_CLOUD
                )
            )
            CircleBox.breadcrumb("cloud_uploader_enabled", mapOf("mode" to "core_cloud"))
        } catch (error: IllegalArgumentException) {
            CircleBox.breadcrumb(
                "cloud_uploader_start_failed",
                mapOf("error" to (error.message ?: "invalid_config"))
            )
        }
    }
}
