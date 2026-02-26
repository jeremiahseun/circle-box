package com.circlebox.cloud

enum class CircleBoxCloudUsageMode(val wireValue: String) {
    OFFLINE_ONLY("offline_only"),
    CORE_CLOUD("core_cloud"),
    CORE_ADAPTERS("core_adapters"),
    CORE_CLOUD_ADAPTERS("core_cloud_adapters"),
    SELF_HOST("self_host"),
}
