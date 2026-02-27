# Public Registry Publish Runbook

This runbook is for publishing CircleBox packages to public registries after a tagged release (example: `v0.3.1`).

## Scope

- Swift/iOS: SwiftPM (already tag-based) + CocoaPods (`CircleBoxSDK`, `CircleBoxCloud`)
- Android/Kotlin: Maven Central (`circlebox-sdk`, `circlebox-cloud`, `circlebox-integrations`)
- Flutter: pub.dev (`circlebox_flutter`, `circlebox_cloud_flutter`, `circlebox_adapters`)
- React Native: npm (`circlebox-react-native`, `circlebox-cloud-react-native`)

## Prerequisites

1. Git tag exists and CI release artifacts are green.
2. `scripts/check_release_versions.sh <version>` passes.
3. Registry credentials are configured locally/CI:
- CocoaPods trunk token
- Sonatype Central credentials + GPG signing
- pub.dev publisher access
- npm organization access + OTP

## 1) CocoaPods (iOS)

Specs used:
- `/Users/mac/Documents/GitHub/circlebox/CircleBoxSDK.podspec`
- `/Users/mac/Documents/GitHub/circlebox/CircleBoxCloud.podspec`

Validate:

```bash
cd /Users/mac/Documents/GitHub/circlebox
pod spec lint CircleBoxSDK.podspec --allow-warnings
pod spec lint CircleBoxCloud.podspec --allow-warnings
```

Publish:

```bash
cd /Users/mac/Documents/GitHub/circlebox
pod trunk push CircleBoxSDK.podspec --allow-warnings
pod trunk push CircleBoxCloud.podspec --allow-warnings
```

## 2) Maven Central (Android)

Modules:
- `/Users/mac/Documents/GitHub/circlebox/android/circlebox-sdk`
- `/Users/mac/Documents/GitHub/circlebox/android/circlebox-cloud`
- `/Users/mac/Documents/GitHub/circlebox/integrations/android/circlebox-integrations`

Publish (example task names; adapt to CI pipeline):

```bash
cd /Users/mac/Documents/GitHub/circlebox/android/circlebox-sdk
./gradlew publish

cd /Users/mac/Documents/GitHub/circlebox/android/circlebox-cloud
./gradlew publish

cd /Users/mac/Documents/GitHub/circlebox/integrations/android/circlebox-integrations
./gradlew publish
```

## 3) npm (React Native)

Packages:
- `/Users/mac/Documents/GitHub/circlebox/react-native/circlebox-react-native`
- `/Users/mac/Documents/GitHub/circlebox/react-native/circlebox-cloud-react-native`

Publish:

```bash
cd /Users/mac/Documents/GitHub/circlebox/react-native/circlebox-react-native
npm publish --access public

cd /Users/mac/Documents/GitHub/circlebox/react-native/circlebox-cloud-react-native
npm publish --access public
```

## 4) pub.dev (Flutter)

Packages:
- `/Users/mac/Documents/GitHub/circlebox/flutter/circlebox_flutter`
- `/Users/mac/Documents/GitHub/circlebox/flutter/circlebox_cloud_flutter`
- `/Users/mac/Documents/GitHub/circlebox/flutter/circlebox_adapters`

Before publish:
- Remove `publish_to: "none"` where present.
- Replace git dependencies with hosted versions when publishing dependent packages.

Publish:

```bash
cd /Users/mac/Documents/GitHub/circlebox/flutter/circlebox_flutter
flutter pub publish

cd /Users/mac/Documents/GitHub/circlebox/flutter/circlebox_cloud_flutter
flutter pub publish

cd /Users/mac/Documents/GitHub/circlebox/flutter/circlebox_adapters
flutter pub publish
```

## Publish Order (Recommended)

1. CocoaPods (`CircleBoxSDK`, `CircleBoxCloud`)
2. Maven Central (`circlebox-sdk`, `circlebox-cloud`, `circlebox-integrations`)
3. npm (`circlebox-react-native`, `circlebox-cloud-react-native`)
4. pub.dev (`circlebox_flutter`, then dependents)

## Post-Publish Verification

1. Install each package in clean sample apps.
2. Verify native start/breadcrumb/export API calls.
3. Run crash -> relaunch -> pending export flow.
4. Verify cloud upload + dashboard ingestion end-to-end.
