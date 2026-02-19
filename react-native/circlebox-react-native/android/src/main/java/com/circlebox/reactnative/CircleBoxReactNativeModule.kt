package com.circlebox.reactnative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import java.io.File

class CircleBoxReactNativeModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "CircleBoxReactNative"

    @ReactMethod
    fun start(config: ReadableMap?, promise: Promise) {
        runCatching {
            invokeStart(config)
            promise.resolve(null)
        }.getOrElse { error ->
            promise.reject("circlebox_start_failed", error.message, error)
        }
    }

    @ReactMethod
    fun breadcrumb(message: String, attrs: ReadableMap?, promise: Promise) {
        runCatching {
            invokeBreadcrumb(message, attrs?.toStringMap() ?: emptyMap())
            promise.resolve(null)
        }.getOrElse { error ->
            promise.reject("circlebox_breadcrumb_failed", error.message, error)
        }
    }

    @ReactMethod
    fun exportLogs(formats: ReadableArray?, promise: Promise) {
        runCatching {
            val names = formats?.toStringList().orEmpty()
            val paths = if (names.isEmpty()) invokeExportLogs() else invokeExportLogs(names)
            val array = Arguments.createArray()
            paths.forEach(array::pushString)
            promise.resolve(array)
        }.getOrElse { error ->
            promise.reject("circlebox_export_failed", error.message, error)
        }
    }

    @ReactMethod
    fun hasPendingCrashReport(promise: Promise) {
        runCatching {
            val pending = invokeNoArg("hasPendingCrashReport") as? Boolean ?: false
            promise.resolve(pending)
        }.getOrElse { error ->
            promise.reject("circlebox_pending_failed", error.message, error)
        }
    }

    @ReactMethod
    fun clearPendingCrashReport(promise: Promise) {
        runCatching {
            invokeNoArg("clearPendingCrashReport")
            promise.resolve(null)
        }.getOrElse { error ->
            promise.reject("circlebox_clear_failed", error.message, error)
        }
    }

    @ReactMethod
    fun debugSnapshot(maxEvents: Int, promise: Promise) {
        runCatching {
            val events = invokeDebugSnapshot(maxEvents)
            val array = Arguments.createArray()
            events.forEach { event ->
                val map = Arguments.createMap()
                event.forEach { (key, value) ->
                    when (value) {
                        null -> map.putNull(key)
                        is String -> map.putString(key, value)
                        is Int -> map.putInt(key, value)
                        is Long -> map.putDouble(key, value.toDouble())
                        is Double -> map.putDouble(key, value)
                        is Boolean -> map.putBoolean(key, value)
                        is Map<*, *> -> {
                            val nested = Arguments.createMap()
                            value.forEach { (nestedKey, nestedValue) ->
                                nested.putString(nestedKey.toString(), nestedValue?.toString())
                            }
                            map.putMap(key, nested)
                        }
                        else -> map.putString(key, value.toString())
                    }
                }
                array.pushMap(map)
            }
            promise.resolve(array)
        }.getOrElse { error ->
            promise.reject("circlebox_debug_snapshot_failed", error.message, error)
        }
    }

    private fun invokeStart(config: ReadableMap?) {
        val clazz = Class.forName("com.circlebox.sdk.CircleBox")
        if (config == null) {
            invokeNoArg("start")
            return
        }

        val configClass = Class.forName("com.circlebox.sdk.CircleBoxConfig")
        val bufferCapacity = config.getIntOrDefault("bufferCapacity", 50)
        val jankThresholdMs = config.getLongOrDefault("jankThresholdMs", 200L)
        val sanitizeAttributes = config.getBooleanOrDefault("sanitizeAttributes", true)
        val maxAttributeLength = config.getIntOrDefault("maxAttributeLength", 256)
        val diskCheckIntervalSec = config.getLongOrDefault("diskCheckIntervalSec", 60L)
        val enableDebugViewer = config.getBooleanOrDefault("enableDebugViewer", false)

        val instance = runCatching {
            configClass
                .getConstructor(
                    Int::class.javaPrimitiveType,
                    Long::class.javaPrimitiveType,
                    Boolean::class.javaPrimitiveType,
                    Int::class.javaPrimitiveType,
                    Long::class.javaPrimitiveType,
                    Boolean::class.javaPrimitiveType
                )
                .newInstance(
                    bufferCapacity,
                    jankThresholdMs,
                    sanitizeAttributes,
                    maxAttributeLength,
                    diskCheckIntervalSec,
                    enableDebugViewer
                )
        }.getOrElse {
            configClass
                .getConstructor(
                    Int::class.javaPrimitiveType,
                    Long::class.javaPrimitiveType,
                    Boolean::class.javaPrimitiveType,
                    Int::class.javaPrimitiveType,
                    Long::class.javaPrimitiveType
                )
                .newInstance(
                    bufferCapacity,
                    jankThresholdMs,
                    sanitizeAttributes,
                    maxAttributeLength,
                    diskCheckIntervalSec
                )
        }

        clazz.getMethod("start", configClass).invoke(null, instance)
    }

    private fun invokeBreadcrumb(message: String, attrs: Map<String, String>) {
        val clazz = Class.forName("com.circlebox.sdk.CircleBox")
        val method = clazz.getMethod("breadcrumb", String::class.java, Map::class.java)
        method.invoke(null, message, attrs)
    }

    private fun invokeExportLogs(): List<String> {
        val raw = invokeNoArg("exportLogs")
        return mapFiles(raw)
    }

    private fun invokeExportLogs(formats: List<String>): List<String> {
        val clazz = Class.forName("com.circlebox.sdk.CircleBox")
        val exportEnumClass = Class.forName("com.circlebox.sdk.CircleBoxExportFormat")
        val set = LinkedHashSet<Any>()

        formats.forEach { wireName ->
            val enumName = wireName.uppercase()
            runCatching {
                val value = exportEnumClass.getMethod("valueOf", String::class.java).invoke(null, enumName)
                set.add(value)
            }
        }

        if (set.isEmpty()) {
            return invokeExportLogs()
        }

        val raw = clazz.getMethod("exportLogs", Set::class.java).invoke(null, set)
        return mapFiles(raw)
    }

    private fun invokeDebugSnapshot(maxEvents: Int): List<Map<String, Any?>> {
        val clazz = Class.forName("com.circlebox.sdk.CircleBox")
        val method = runCatching {
            clazz.getMethod("debugSnapshot", Int::class.javaPrimitiveType)
        }.getOrNull() ?: return emptyList()

        val raw = method.invoke(null, maxEvents) as? List<*> ?: return emptyList()
        return raw.mapNotNull { item ->
            val instance = item ?: return@mapNotNull null
            val eventClass = instance.javaClass

            @Suppress("UNCHECKED_CAST")
            val attrsRaw = runCatching {
                eventClass.getMethod("getAttrs").invoke(instance) as? Map<Any?, Any?>
            }.getOrNull() ?: emptyMap()

            val attrs = LinkedHashMap<String, String>(attrsRaw.size)
            attrsRaw.forEach { (key, value) ->
                attrs[key.toString()] = value?.toString() ?: ""
            }

            linkedMapOf(
                "seq" to runCatching { eventClass.getMethod("getSeq").invoke(instance) as? Number }.getOrNull()?.toLong(),
                "timestamp_unix_ms" to runCatching { eventClass.getMethod("getTimestampUnixMs").invoke(instance) as? Number }.getOrNull()?.toLong(),
                "uptime_ms" to runCatching { eventClass.getMethod("getUptimeMs").invoke(instance) as? Number }.getOrNull()?.toLong(),
                "type" to runCatching { eventClass.getMethod("getType").invoke(instance)?.toString() }.getOrNull(),
                "thread" to runCatching { eventClass.getMethod("getThread").invoke(instance)?.toString()?.lowercase() }.getOrNull(),
                "severity" to runCatching { eventClass.getMethod("getSeverity").invoke(instance)?.toString()?.lowercase() }.getOrNull(),
                "attrs" to attrs
            )
        }
    }

    private fun invokeNoArg(methodName: String): Any? {
        val clazz = Class.forName("com.circlebox.sdk.CircleBox")
        return clazz.getMethod(methodName).invoke(null)
    }

    private fun mapFiles(raw: Any?): List<String> {
        val files = raw as? List<*> ?: return emptyList()
        return files.mapNotNull { item ->
            when (item) {
                is File -> item.absolutePath
                is String -> item
                else -> null
            }
        }
    }

    private fun ReadableMap.toStringMap(): Map<String, String> {
        val keyIterator = keySetIterator()
        val map = LinkedHashMap<String, String>()
        while (keyIterator.hasNextKey()) {
            val key = keyIterator.nextKey()
            map[key] = when (getType(key)) {
                ReadableType.Boolean -> getBoolean(key).toString()
                ReadableType.Number -> getDouble(key).toString()
                ReadableType.String -> getString(key) ?: ""
                ReadableType.Null -> ""
                else -> getDynamic(key).toString()
            }
        }
        return map
    }

    private fun ReadableMap.getIntOrDefault(key: String, fallback: Int): Int {
        return if (hasKey(key) && !isNull(key)) {
            when (getType(key)) {
                ReadableType.Number -> getDouble(key).toInt()
                ReadableType.String -> getString(key)?.toIntOrNull() ?: fallback
                else -> fallback
            }
        } else {
            fallback
        }
    }

    private fun ReadableMap.getLongOrDefault(key: String, fallback: Long): Long {
        return if (hasKey(key) && !isNull(key)) {
            when (getType(key)) {
                ReadableType.Number -> getDouble(key).toLong()
                ReadableType.String -> getString(key)?.toLongOrNull() ?: fallback
                else -> fallback
            }
        } else {
            fallback
        }
    }

    private fun ReadableMap.getBooleanOrDefault(key: String, fallback: Boolean): Boolean {
        return if (hasKey(key) && !isNull(key)) getBoolean(key) else fallback
    }

    private fun ReadableArray.toStringList(): List<String> {
        val output = ArrayList<String>(size())
        for (index in 0 until size()) {
            output += getString(index) ?: continue
        }
        return output
    }
}
