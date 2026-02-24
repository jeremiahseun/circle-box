package com.circlebox.cloud

data class CircleBoxCloudConfig(
    val endpoint: String,
    val ingestKey: String,
    val region: String = "auto",
    val enableFragmentSync: Boolean = true,
    val flushIntervalSec: Long = 60,
    val maxQueueMB: Int = 20,
    val wifiOnly: Boolean = false,
    val retryMaxBackoffSec: Long = 900,
    val enableAutoFlush: Boolean = true,
    val autoExportPendingOnStart: Boolean = true
) {
    init {
        require(endpoint.startsWith("http")) { "endpoint must be a valid http(s) URL" }
        require(ingestKey.startsWith("cb_live_")) { "ingestKey must use cb_live_ prefix" }
        require(flushIntervalSec >= 10) { "flushIntervalSec must be >= 10" }
        require(maxQueueMB > 0) { "maxQueueMB must be > 0" }
        require(retryMaxBackoffSec >= 30) { "retryMaxBackoffSec must be >= 30" }
    }
}
