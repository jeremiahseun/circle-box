package com.circlebox.sdk

import android.content.Context
import android.os.Build
import java.util.UUID

internal data class CircleBoxEnvironment(
    val sessionId: String,
    val platform: String,
    val appVersion: String,
    val buildNumber: String,
    val osVersion: String,
    val deviceModel: String
)

internal object CircleBoxEnvironmentFactory {
    fun capture(context: Context): CircleBoxEnvironment {
        val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
        val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            packageInfo.longVersionCode.toString()
        } else {
            @Suppress("DEPRECATION")
            packageInfo.versionCode.toString()
        }

        return CircleBoxEnvironment(
            sessionId = UUID.randomUUID().toString(),
            platform = "android",
            appVersion = packageInfo.versionName ?: "0",
            buildNumber = versionCode,
            osVersion = Build.VERSION.RELEASE ?: "0",
            deviceModel = "${Build.MANUFACTURER} ${Build.MODEL}".trim()
        )
    }
}
