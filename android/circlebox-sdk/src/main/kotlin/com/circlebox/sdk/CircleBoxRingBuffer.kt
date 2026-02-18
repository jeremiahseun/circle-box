package com.circlebox.sdk

import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * Fixed-capacity circular buffer protected by a [Mutex].
 *
 * Writes are synchronous on purpose so crash-time snapshots always observe committed events.
 */
internal class CircleBoxRingBuffer<T>(capacity: Int) {
    private val capacity = capacity.coerceAtLeast(1)
    private val mutex = Mutex()
    private val storage = arrayOfNulls<Any>(this.capacity)
    private var writeIndex = 0
    private var storedCount = 0
    private var sequence: Long = 0

    fun append(factory: (Long) -> T) {
        runBlocking {
            mutex.withLock {
                val next = sequence++
                storage[writeIndex] = factory(next)
                writeIndex = (writeIndex + 1) % this@CircleBoxRingBuffer.capacity
                storedCount = minOf(storedCount + 1, this@CircleBoxRingBuffer.capacity)
            }
        }
    }

    @Suppress("UNCHECKED_CAST")
    fun snapshot(): List<T> = runBlocking {
        mutex.withLock {
            if (storedCount == 0) {
                return@withLock emptyList()
            }

            val result = ArrayList<T>(storedCount)
            // Once full, writeIndex points at the oldest item in the buffer.
            val start = if (storedCount == capacity) writeIndex else 0
            for (offset in 0 until storedCount) {
                val index = (start + offset) % capacity
                val value = storage[index] as T?
                if (value != null) {
                    result.add(value)
                }
            }
            result
        }
    }

    fun count(): Int = runBlocking {
        mutex.withLock { storedCount }
    }
}
