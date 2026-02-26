plugins {
    id("com.android.library")
    kotlin("android")
    kotlin("plugin.serialization")
    id("maven-publish")
}

group = "com.circlebox.sdk"
version = "0.3.1"

android {
    namespace = "com.circlebox.sdk"
    compileSdk = 34

    defaultConfig {
        minSdk = 23
        consumerProguardFiles("consumer-rules.pro")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "consumer-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    testOptions {
        unitTests.isReturnDefaultValues = true
    }

    publishing {
        singleVariant("release") {
            withSourcesJar()
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-process:2.8.4")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    // Keep serialization runtime aligned with Kotlin 1.9.x used by this module.
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
}

afterEvaluate {
    publishing {
        publications {
            create<MavenPublication>("release") {
                from(components["release"])
                groupId = "com.circlebox.sdk"
                artifactId = "circlebox-sdk"
                version = project.version.toString()

                pom {
                    name.set("circlebox-sdk")
                    description.set("Native CircleBox core SDK for Android")
                    url.set("https://github.com/jeremiahseun/circlebox")
                }
            }
        }
    }
}
