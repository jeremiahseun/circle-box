package com.circlebox.flutter_circlebox

import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.MethodChannel.MethodCallHandler
import io.flutter.plugin.common.MethodChannel.Result
import java.io.File

/**
 * Flutter bridge for the Android CircleBox SDK.
 *
 * Reflection is used so the plugin can compile even when the host app has not
 * wired the native CircleBox dependency yet.
 */
class CircleboxFlutterPlugin : FlutterPlugin, MethodCallHandler {
    private lateinit var channel: MethodChannel

    override fun onAttachedToEngine(flutterPluginBinding: FlutterPlugin.FlutterPluginBinding) {
        channel = MethodChannel(flutterPluginBinding.binaryMessenger, "circlebox_flutter")
        channel.setMethodCallHandler(this)
    }

    override fun onMethodCall(call: MethodCall, result: Result) {
        try {
            when (call.method) {
                "start" -> {
                    @Suppress("UNCHECKED_CAST")
                    val config = call.arguments as? Map<String, Any?>
                    invokeStart(config)
                    result.success(null)
                }

                "breadcrumb" -> {
                    val message = call.argument<String>("message") ?: ""
                    @Suppress("UNCHECKED_CAST")
                    val attrs = call.argument<Map<String, String>>("attrs") ?: emptyMap()
                    invokeBreadcrumb(message, attrs)
                    result.success(null)
                }

                "exportLogs" -> {
                    @Suppress("UNCHECKED_CAST")
                    val args = call.arguments as? Map<String, Any?>
                    @Suppress("UNCHECKED_CAST")
                    val formats = args?.get("formats") as? List<String> ?: emptyList()
                    val files = if (formats.isEmpty()) invokeExportLogs() else invokeExportLogs(formats)
                    result.success(files)
                }

                "hasPendingCrashReport" -> {
                    val pending = invokeNoArg("hasPendingCrashReport") as? Boolean ?: false
                    result.success(pending)
                }

                "clearPendingCrashReport" -> {
                    invokeNoArg("clearPendingCrashReport")
                    result.success(null)
                }

                else -> result.notImplemented()
            }
        } catch (error: ClassNotFoundException) {
            result.error("missing_native_sdk", "Native CircleBox Android SDK not found in host app", error.message)
        } catch (error: Throwable) {
            result.error("circlebox_error", error.message, null)
        }
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        channel.setMethodCallHandler(null)
    }

    private fun invokeNoArg(methodName: String): Any? {
        val clazz = Class.forName("com.circlebox.sdk.CircleBox")
        val method = clazz.getMethod(methodName)
        return method.invoke(null)
    }

    private fun invokeStart(config: Map<String, Any?>?) {
        val clazz = Class.forName("com.circlebox.sdk.CircleBox")
        if (config == null) {
            invokeNoArg("start")
            return
        }

        val configClass = Class.forName("com.circlebox.sdk.CircleBoxConfig")
        val ctor = configClass.getConstructor(
            Int::class.javaPrimitiveType,
            Long::class.javaPrimitiveType,
            Boolean::class.javaPrimitiveType,
            Int::class.javaPrimitiveType,
            Long::class.javaPrimitiveType
        )

        val instance = ctor.newInstance(
            (config["bufferCapacity"] as? Number)?.toInt() ?: 50,
            (config["jankThresholdMs"] as? Number)?.toLong() ?: 200L,
            (config["sanitizeAttributes"] as? Boolean) ?: true,
            (config["maxAttributeLength"] as? Number)?.toInt() ?: 256,
            (config["diskCheckIntervalSec"] as? Number)?.toLong() ?: 60L
        )

        val method = clazz.getMethod("start", configClass)
        method.invoke(null, instance)
    }

    @Suppress("UNCHECKED_CAST")
    private fun invokeBreadcrumb(message: String, attrs: Map<String, String>) {
        val clazz = Class.forName("com.circlebox.sdk.CircleBox")
        val withAttrs = runCatching { clazz.getMethod("breadcrumb", String::class.java, Map::class.java) }.getOrNull()
        if (withAttrs != null) {
            withAttrs.invoke(null, message, attrs)
            return
        }

        val withoutAttrs = clazz.getMethod("breadcrumb", String::class.java)
        withoutAttrs.invoke(null, message)
    }

    private fun invokeExportLogs(): List<String> {
        val raw = invokeNoArg("exportLogs")
        return mapFiles(raw)
    }

    @Suppress("UNCHECKED_CAST")
    private fun invokeExportLogs(formats: List<String>): List<String> {
        val clazz = Class.forName("com.circlebox.sdk.CircleBox")
        val exportEnumClass = Class.forName("com.circlebox.sdk.CircleBoxExportFormat")
        val set = LinkedHashSet<Any>()
        formats.forEach { item ->
            val enumName = item.uppercase()
            runCatching {
                val value = exportEnumClass.getMethod("valueOf", String::class.java).invoke(null, enumName)
                set.add(value)
            }
        }

        if (set.isEmpty()) {
            return invokeExportLogs()
        }

        val method = clazz.getMethod("exportLogs", Set::class.java)
        val raw = method.invoke(null, set)
        return mapFiles(raw)
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
}
