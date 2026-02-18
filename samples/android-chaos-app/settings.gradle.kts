pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "circlebox-android-chaos-app"
include(":app")
include(":circlebox-sdk")
project(":circlebox-sdk").projectDir = file("../../android/circlebox-sdk")
