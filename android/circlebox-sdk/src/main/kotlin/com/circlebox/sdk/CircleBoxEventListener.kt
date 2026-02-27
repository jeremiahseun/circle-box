package com.circlebox.sdk

/**
 * Realtime listener for CircleBox events.
 */
fun interface CircleBoxEventListener {
    fun onEvent(event: CircleBoxEvent)
}
