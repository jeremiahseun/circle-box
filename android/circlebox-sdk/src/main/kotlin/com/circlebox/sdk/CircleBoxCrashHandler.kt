package com.circlebox.sdk

internal class CircleBoxCrashHandler(
    private val onCrash: (thread: Thread, throwable: Throwable) -> Unit
) {
    private var previousHandler: Thread.UncaughtExceptionHandler? = null

    fun install() {
        // Preserve existing crash behavior for compatibility with other SDKs.
        previousHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                onCrash(thread, throwable)
            } catch (_: Throwable) {
                // Crash path must be best effort.
            }

            val previous = previousHandler
            if (previous != null) {
                previous.uncaughtException(thread, throwable)
            } else {
                thread.threadGroup?.uncaughtException(thread, throwable)
            }
        }
    }
}
