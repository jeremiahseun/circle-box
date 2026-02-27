# CircleBox React Native Chaos App

Expo-prebuild sample for validating the React Native bridge end-to-end.

## What It Validates

- React Native API parity (`start`, `breadcrumb`, `exportLogs`, `hasPendingCrashReport`, `clearPendingCrashReport`)
- Automatic JS error hook capture (global handler + unhandled rejection best effort)
- Export generation (`json`, `csv`, `json_gzip`, `csv_gzip`, `summary`)
- Local debug viewer snapshot via `debugSnapshot` with type/severity/thread filters

## Run

```bash
cd samples/react-native-chaos-app
npm install
npx expo prebuild
npm run ios
# or
npm run android
```

If bundling reports `Unable to resolve "circlebox-react-native"`, clear Metro cache and restart:

```bash
cd samples/react-native-chaos-app
npx expo start --clear
```

If iOS `pod install` fails with:

- `Unable to find a specification for ReactAppDependencyProvider depended upon by Expo`

your app is likely using an incompatible React Native version for Expo SDK 53.
Use the versions in this sample (`react 19.0.0`, `react-native 0.79.6`), then regenerate native folders:

```bash
cd samples/react-native-chaos-app
rm -rf ios android node_modules package-lock.json
npm install
npx expo prebuild --clean
```

## Manual Flow

1. Tap mock actions and breadcrumb action.
2. Trigger JS exception and unhandled rejection actions.
3. Export logs and inspect generated file paths.
4. Relaunch app after a native hard crash test and verify pending report detection.
