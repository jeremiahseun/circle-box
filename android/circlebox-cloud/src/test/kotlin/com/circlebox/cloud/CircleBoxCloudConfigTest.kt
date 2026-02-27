package com.circlebox.cloud

import org.junit.Assert.assertTrue
import org.junit.Test

class CircleBoxCloudConfigTest {
    @Test
    fun acceptsValidConfig() {
        val config = CircleBoxCloudConfig(
            endpoint = "https://api.circlebox.dev",
            ingestKey = "cb_live_demo_key"
        )

        assertTrue(config.enableFragmentSync)
        assertTrue(config.flushIntervalSec == 15L)
        assertTrue(config.enableAutoFlush)
        assertTrue(config.autoExportPendingOnStart)
        assertTrue(config.immediateFlushOnHighSignal)
        assertTrue(!config.enableUsageBeacon)
        assertTrue(config.usageBeaconKey == null)
        assertTrue(config.usageBeaconMode == CircleBoxCloudUsageMode.CORE_CLOUD)
    }
}
