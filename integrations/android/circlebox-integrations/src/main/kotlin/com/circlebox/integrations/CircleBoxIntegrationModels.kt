package com.circlebox.integrations

data class CircleBoxAdapterEvent(
    val seq: Long,
    val timestampUnixMs: Long,
    val uptimeMs: Long,
    val type: String,
    val thread: String,
    val severity: String,
    val attrs: Map<String, String>
)

data class CircleBoxAdapterEnvelope(
    val schemaVersion: Int,
    val sessionId: String,
    val platform: String,
    val appVersion: String,
    val buildNumber: String,
    val osVersion: String,
    val deviceModel: String,
    val exportSource: String,
    val captureReason: String,
    val generatedAtUnixMs: Long,
    val events: List<CircleBoxAdapterEvent>
)

data class CircleBoxSentryBreadcrumb(
    val category: String,
    val level: String,
    val message: String,
    val timestampUnixMs: Long,
    val data: Map<String, String>
)

data class CircleBoxPostHogEvent(
    val event: String,
    val properties: Map<String, String>
)
