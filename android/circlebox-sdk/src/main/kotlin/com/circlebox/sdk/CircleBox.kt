package com.circlebox.sdk

import android.content.Context
import java.io.File

/**
 * Public entrypoint for the CircleBox Android SDK.
 *
 * Start once during application launch, then add breadcrumbs at important user actions.
 */
object CircleBox {
    private val lock = Any()

    @Volatile
    private var appContext: Context? = null

    @Volatile
    private var runtime: CircleBoxRuntime? = null

    internal fun installContext(context: Context) {
        appContext = context.applicationContext
    }

    /**
     * Starts CircleBox with the given [config].
     *
     * Repeated calls after the first successful start are ignored.
     */
    @JvmStatic
    fun start(config: CircleBoxConfig = CircleBoxConfig()) {
        val rt = runtime()
        rt.start(config)
    }

    @JvmStatic
    fun start() {
        start(CircleBoxConfig())
    }

    /**
     * Adds a custom breadcrumb event to the in-memory ring buffer.
     */
    @JvmStatic
    fun breadcrumb(message: String, attrs: Map<String, String> = emptyMap()) {
        val rt = runtime()
        rt.breadcrumb(message, attrs)
    }

    @JvmStatic
    fun breadcrumb(message: String) {
        breadcrumb(message, emptyMap())
    }

    /**
     * Exports the latest report to files and returns absolute file handles.
     */
    @JvmStatic
    fun exportLogs(formats: Set<CircleBoxExportFormat> = setOf(CircleBoxExportFormat.JSON, CircleBoxExportFormat.CSV)): List<File> {
        val rt = runtime()
        return rt.exportLogs(formats)
    }

    @JvmStatic
    fun exportLogs(): List<File> {
        return exportLogs(setOf(CircleBoxExportFormat.JSON, CircleBoxExportFormat.CSV))
    }

    /**
     * Returns true when a crash report from a previous process run is available.
     */
    @JvmStatic
    fun hasPendingCrashReport(): Boolean {
        return runtime().hasPendingCrashReport()
    }

    /**
     * Clears the pending crash report file if it exists.
     */
    @JvmStatic
    fun clearPendingCrashReport() {
        runtime().clearPendingCrashReport()
    }

    private fun runtime(): CircleBoxRuntime {
        runtime?.let { return it }

        synchronized(lock) {
            runtime?.let { return it }

            val context = appContext
                ?: throw IllegalStateException("CircleBox context missing. Ensure CircleBoxInitProvider is merged or call installContext().")

            // Runtime is created lazily so apps can install context before the first API call.
            val created = CircleBoxRuntime(context)
            runtime = created
            return created
        }
    }
}
