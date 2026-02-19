package com.circlebox.sdk

import java.io.ByteArrayOutputStream

internal object CircleBoxProtobufPersistence {
    private const val WIRE_VERSION = 1L

    fun encodeEnvelope(envelope: CircleBoxEnvelope): ByteArray {
        val payload = CircleBoxSerializer.encodeEnvelope(envelope).toByteArray(Charsets.UTF_8)
        val out = ByteArrayOutputStream()
        writeVarintField(out, 1, WIRE_VERSION)
        writeLengthDelimitedField(out, 2, payload)
        return out.toByteArray()
    }

    fun decodeEnvelope(data: ByteArray): CircleBoxEnvelope? {
        // Legacy path: previous versions persisted raw JSON bytes.
        if (data.isNotEmpty() && data[0] == '{'.code.toByte()) {
            return CircleBoxSerializer.decodeEnvelope(data.toString(Charsets.UTF_8))
        }

        var index = 0
        var payload: ByteArray? = null

        while (index < data.size) {
            val key = readVarint(data, index) ?: return decodeLegacyJson(data)
            index = key.next

            val wireType = (key.value and 0x7).toInt()
            val fieldNumber = key.value ushr 3

            when {
                fieldNumber == 1L && wireType == 0 -> {
                    val ignored = readVarint(data, index) ?: return decodeLegacyJson(data)
                    index = ignored.next
                }
                fieldNumber == 2L && wireType == 2 -> {
                    val lengthInfo = readVarint(data, index) ?: return decodeLegacyJson(data)
                    index = lengthInfo.next
                    val length = lengthInfo.value.toInt()
                    if (length < 0 || index + length > data.size) {
                        return decodeLegacyJson(data)
                    }
                    payload = data.copyOfRange(index, index + length)
                    index += length
                }
                else -> {
                    index = skipField(data, index, wireType) ?: return decodeLegacyJson(data)
                }
            }
        }

        val bytes = payload ?: return decodeLegacyJson(data)
        return CircleBoxSerializer.decodeEnvelope(bytes.toString(Charsets.UTF_8))
    }

    private fun decodeLegacyJson(data: ByteArray): CircleBoxEnvelope? {
        return CircleBoxSerializer.decodeEnvelope(data.toString(Charsets.UTF_8))
    }

    private fun writeVarintField(out: ByteArrayOutputStream, fieldNumber: Int, value: Long) {
        writeVarint(out, ((fieldNumber.toLong() shl 3) or 0L))
        writeVarint(out, value)
    }

    private fun writeLengthDelimitedField(out: ByteArrayOutputStream, fieldNumber: Int, payload: ByteArray) {
        writeVarint(out, ((fieldNumber.toLong() shl 3) or 2L))
        writeVarint(out, payload.size.toLong())
        out.write(payload)
    }

    private fun writeVarint(out: ByteArrayOutputStream, value: Long) {
        var remaining = value
        while (true) {
            if ((remaining and 0x7FL.inv()) == 0L) {
                out.write(remaining.toInt())
                return
            }
            out.write(((remaining and 0x7F) or 0x80).toInt())
            remaining = remaining ushr 7
        }
    }

    private data class VarintRead(val value: Long, val next: Int)

    private fun readVarint(data: ByteArray, start: Int): VarintRead? {
        var index = start
        var shift = 0
        var value = 0L

        while (index < data.size && shift <= 63) {
            val byte = data[index].toInt() and 0xFF
            value = value or ((byte and 0x7F).toLong() shl shift)
            index += 1
            if ((byte and 0x80) == 0) {
                return VarintRead(value, index)
            }
            shift += 7
        }

        return null
    }

    private fun skipField(data: ByteArray, start: Int, wireType: Int): Int? {
        return when (wireType) {
            0 -> readVarint(data, start)?.next
            1 -> if (start + 8 <= data.size) start + 8 else null
            2 -> {
                val lengthInfo = readVarint(data, start) ?: return null
                val length = lengthInfo.value.toInt()
                if (length < 0 || lengthInfo.next + length > data.size) {
                    null
                } else {
                    lengthInfo.next + length
                }
            }
            5 -> if (start + 4 <= data.size) start + 4 else null
            else -> null
        }
    }
}
