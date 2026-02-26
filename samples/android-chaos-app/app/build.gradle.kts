plugins {
    id("com.android.application")
    kotlin("android")
}

fun quoteForBuildConfig(value: String): String {
    val escaped = value.replace("\\", "\\\\").replace("\"", "\\\"")
    return "\"$escaped\""
}

val circleboxWorkerBaseUrl = (project.findProperty("CIRCLEBOX_WORKER_BASE_URL") as String?)?.trim().orEmpty()
val circleboxIngestKey = (project.findProperty("CIRCLEBOX_INGEST_KEY") as String?)?.trim().orEmpty()
val circleboxUsageKey = (project.findProperty("CIRCLEBOX_USAGE_KEY") as String?)?.trim().orEmpty()

android {
    namespace = "com.circlebox.sample"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.circlebox.sample"
        minSdk = 23
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
        buildConfigField("String", "CIRCLEBOX_WORKER_BASE_URL", quoteForBuildConfig(circleboxWorkerBaseUrl))
        buildConfigField("String", "CIRCLEBOX_INGEST_KEY", quoteForBuildConfig(circleboxIngestKey))
        buildConfigField("String", "CIRCLEBOX_USAGE_KEY", quoteForBuildConfig(circleboxUsageKey))
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation(project(":circlebox-sdk"))
    implementation(project(":circlebox-cloud"))
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
}
