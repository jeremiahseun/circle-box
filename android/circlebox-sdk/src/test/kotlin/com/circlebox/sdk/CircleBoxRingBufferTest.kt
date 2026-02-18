package com.circlebox.sdk

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CircleBoxRingBufferTest {
    @Test
    fun holdsFortyNineEvents() {
        val buffer = CircleBoxRingBuffer<Long>(50)
        repeat(49) { buffer.append { it } }

        val snapshot = buffer.snapshot()
        assertEquals(49, snapshot.size)
        assertEquals(0L, snapshot.first())
        assertEquals(48L, snapshot.last())
    }

    @Test
    fun holdsFiftyEvents() {
        val buffer = CircleBoxRingBuffer<Long>(50)
        repeat(50) { buffer.append { it } }

        val snapshot = buffer.snapshot()
        assertEquals(50, snapshot.size)
        assertEquals(0L, snapshot.first())
        assertEquals(49L, snapshot.last())
    }

    @Test
    fun overwritesOnFiftyFirstEvent() {
        val buffer = CircleBoxRingBuffer<Long>(50)
        repeat(51) { buffer.append { it } }

        val snapshot = buffer.snapshot()
        assertEquals(50, snapshot.size)
        assertEquals(1L, snapshot.first())
        assertEquals(50L, snapshot.last())
    }

    @Test
    fun keepsMostRecentFiftyAtFiveHundred() {
        val buffer = CircleBoxRingBuffer<Long>(50)
        repeat(500) { buffer.append { it } }

        val snapshot = buffer.snapshot()
        assertEquals(50, snapshot.size)
        assertEquals(450L, snapshot.first())
        assertEquals(499L, snapshot.last())
    }

    @Test
    fun concurrentAppendsStayMonotonic() {
        val buffer = CircleBoxRingBuffer<Long>(50)
        val threads = (0 until 200).map {
            Thread { buffer.append { it } }
        }
        threads.forEach(Thread::start)
        threads.forEach(Thread::join)

        val snapshot = buffer.snapshot()
        assertEquals(50, snapshot.size)
        assertTrue(snapshot.zipWithNext().all { (a, b) -> b > a })
    }
}
