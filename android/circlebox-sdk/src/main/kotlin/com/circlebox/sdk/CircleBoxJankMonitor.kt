package com.circlebox.sdk

import android.os.Handler
import android.os.Looper
import android.view.Choreographer

internal class CircleBoxJankMonitor(
    private val thresholdMs: Long,
    private val onJank: (blockedMs: Long) -> Unit
) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var running = false
    private var lastFrameNanos: Long = 0L

    private val frameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (!running) {
                return
            }

            if (lastFrameNanos > 0L) {
                val deltaMs = (frameTimeNanos - lastFrameNanos) / 1_000_000L
                if (deltaMs > thresholdMs) {
                    onJank(deltaMs)
                }
            }

            lastFrameNanos = frameTimeNanos
            Choreographer.getInstance().postFrameCallback(this)
        }
    }

    fun start() {
        if (running) return
        running = true
        mainHandler.post {
            lastFrameNanos = 0L
            Choreographer.getInstance().postFrameCallback(frameCallback)
        }
    }

    fun stop() {
        if (!running) return
        running = false
        mainHandler.post {
            Choreographer.getInstance().removeFrameCallback(frameCallback)
        }
    }
}
