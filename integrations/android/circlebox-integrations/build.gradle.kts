plugins {
    kotlin("jvm") version "1.9.24"
    id("maven-publish")
}

group = "com.circlebox.integrations"
version = "0.3.1"

dependencies {
    implementation(kotlin("stdlib"))
}

kotlin {
    jvmToolchain(17)
}

java {
    withSourcesJar()
    withJavadocJar()
}

publishing {
    publications {
        create<MavenPublication>("mavenJava") {
            from(components["java"])
            groupId = "com.circlebox.integrations"
            artifactId = "circlebox-integrations"
            version = project.version.toString()

            pom {
                name.set("circlebox-integrations")
                description.set("Companion mappers for forwarding CircleBox payloads into Sentry and PostHog")
                url.set("https://github.com/jeremiahseun/circlebox")
            }
        }
    }
}
