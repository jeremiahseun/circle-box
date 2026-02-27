package com.circlebox.cloud

data class CircleBoxCloudConfig(
    val endpoint: String,
    val ingestKey: String,
    val region: String = "auto",
    val enableFragmentSync: Boolean = true,
    val flushIntervalSec: Long = 15,
    val maxQueueMB: Int = 20,
    val wifiOnly: Boolean = false,
    val retryMaxBackoffSec: Long = 900,
    val enableAutoFlush: Boolean = true,
    val autoExportPendingOnStart: Boolean = true,
    val immediateFlushOnHighSignal: Boolean = true,
    val enableUsageBeacon: Boolean = false,
    val usageBeaconKey: String? = null,
    val usageBeaconEndpoint: String? = null,
    val usageBeaconMode: CircleBoxCloudUsageMode = CircleBoxCloudUsageMode.CORE_CLOUD,
    val usageBeaconMinIntervalSec: Long = 300
) {
    init {
        require(endpoint.startsWith("http")) { "endpoint must be a valid http(s) URL" }
        require(ingestKey.startsWith("cb_live_")) { "ingestKey must use cb_live_ prefix" }
        require(flushIntervalSec >= 10) { "flushIntervalSec must be >= 10" }
        require(maxQueueMB > 0) { "maxQueueMB must be > 0" }
        require(retryMaxBackoffSec >= 30) { "retryMaxBackoffSec must be >= 30" }
        require(usageBeaconMinIntervalSec >= 30) { "usageBeaconMinIntervalSec must be >= 30" }
        if (!usageBeaconKey.isNullOrBlank()) {
            require(usageBeaconKey.startsWith("cb_usage_")) { "usageBeaconKey must use cb_usage_ prefix" }
        }
        if (!usageBeaconEndpoint.isNullOrBlank()) {
            require(usageBeaconEndpoint.startsWith("http")) { "usageBeaconEndpoint must be a valid http(s) URL" }
        }
    }
}
