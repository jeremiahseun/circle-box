package com.circlebox.sdk

import android.content.Context
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.UUID

internal class CircleBoxFileStore(context: Context) {
    private val baseDir = File(context.filesDir, "circlebox")
    private val pendingDir = File(baseDir, "pending")
    private val exportDir = File(baseDir, "exports")
    private val pendingFile = File(pendingDir, "latest.circlebox")
    private val checkpointFile = File(pendingDir, "checkpoint.circlebox")

    init {
        ensureDirectories()
    }

    fun hasPendingCrashReport(): Boolean = pendingFile.exists()

    fun clearPendingCrashReport() {
        if (pendingFile.exists() && !pendingFile.delete()) {
            throw IOException("Unable to delete pending crash report: ${pendingFile.absolutePath}")
        }
    }

    fun readPendingEnvelope(): CircleBoxEnvelope? {
        if (!pendingFile.exists()) {
            return null
        }
        val bytes = pendingFile.readBytes()
        return CircleBoxProtobufPersistence.decodeEnvelope(bytes)
    }

    fun writePendingEnvelope(envelope: CircleBoxEnvelope) {
        ensureDirectories()
        atomicWrite(pendingFile, CircleBoxProtobufPersistence.encodeEnvelope(envelope))
    }

    fun readCheckpointEnvelope(): CircleBoxEnvelope? {
        if (!checkpointFile.exists()) {
            return null
        }
        val bytes = checkpointFile.readBytes()
        return CircleBoxProtobufPersistence.decodeEnvelope(bytes)
    }

    fun writeCheckpointEnvelope(envelope: CircleBoxEnvelope) {
        ensureDirectories()
        atomicWrite(checkpointFile, CircleBoxProtobufPersistence.encodeEnvelope(envelope))
    }

    fun clearCheckpointEnvelope() {
        if (checkpointFile.exists() && !checkpointFile.delete()) {
            throw IOException("Unable to delete checkpoint file: ${checkpointFile.absolutePath}")
        }
    }

    fun writeExport(content: String, ext: String): File {
        return writeExport(content.toByteArray(Charsets.UTF_8), ext)
    }

    fun writeExport(content: ByteArray, ext: String): File {
        ensureDirectories()
        val output = File(exportDir, "circlebox-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(8)}.$ext")
        atomicWrite(output, content)
        return output
    }

    fun availableDiskBytes(): Long {
        return baseDir.usableSpace
    }

    private fun ensureDirectories() {
        if (!pendingDir.exists() && !pendingDir.mkdirs()) {
            throw IOException("Unable to create pending directory: ${pendingDir.absolutePath}")
        }
        if (!exportDir.exists() && !exportDir.mkdirs()) {
            throw IOException("Unable to create export directory: ${exportDir.absolutePath}")
        }
    }

    private fun atomicWrite(destination: File, content: ByteArray) {
        val temp = File(destination.parentFile, ".${UUID.randomUUID()}.tmp")
        var shouldCleanupTemp = true
        try {
            FileOutputStream(temp).use { stream ->
                stream.write(content)
                stream.fd.sync()
            }

            if (destination.exists() && !destination.delete()) {
                throw IOException("Unable to replace existing file: ${destination.absolutePath}")
            }

            if (!temp.renameTo(destination)) {
                throw IOException("Unable to move temp file into place: ${destination.absolutePath}")
            }
            shouldCleanupTemp = false
        } finally {
            if (shouldCleanupTemp && temp.exists()) {
                temp.delete()
            }
        }
    }
}
