package com.circlebox.sdk

/**
 * Runtime configuration for CircleBox.
 *
 * Values are validated to ensure safe and predictable runtime behavior.
 */
data class CircleBoxConfig(
    /** Maximum number of events retained in memory. */
    val bufferCapacity: Int = 50,
    /** Main-thread block threshold for `thread_contention` events. */
    val jankThresholdMs: Long = 200,
    /** Enables redaction for common sensitive patterns in event attributes. */
    val sanitizeAttributes: Boolean = true,
    /** Maximum attribute value length before truncation. */
    val maxAttributeLength: Int = 256,
    /** Interval for periodic disk-space samples. */
    val diskCheckIntervalSec: Long = 60
) {
    init {
        require(bufferCapacity > 0) { "bufferCapacity must be > 0" }
        require(jankThresholdMs >= 16) { "jankThresholdMs must be >= 16" }
        require(maxAttributeLength > 0) { "maxAttributeLength must be > 0" }
        require(diskCheckIntervalSec >= 10) { "diskCheckIntervalSec must be >= 10" }
    }
}
