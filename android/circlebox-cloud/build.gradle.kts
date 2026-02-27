plugins {
    id("com.android.library") version "8.5.2"
    kotlin("android") version "1.9.24"
    id("maven-publish")
}

group = "com.circlebox.cloud"
version = "0.3.1"

android {
    namespace = "com.circlebox.cloud"
    compileSdk = 34

    defaultConfig {
        minSdk = 23
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
    implementation("androidx.lifecycle:lifecycle-process:2.8.7")

    testImplementation("junit:junit:4.13.2")
}

afterEvaluate {
    publishing {
        publications {
            create<MavenPublication>("release") {
                from(components["release"])
                groupId = "com.circlebox.cloud"
                artifactId = "circlebox-cloud"
                version = project.version.toString()

                pom {
                    name.set("circlebox-cloud")
                    description.set("CircleBox cloud companion uploader for Android")
                    url.set("https://github.com/jeremiahseun/circlebox")
                }
            }
        }
    }
}
