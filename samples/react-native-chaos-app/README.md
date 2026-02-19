# CircleBox React Native Chaos App

Expo-prebuild sample for validating the React Native bridge end-to-end.

## What It Validates

- React Native API parity (`start`, `breadcrumb`, `exportLogs`, `hasPendingCrashReport`, `clearPendingCrashReport`)
- Automatic JS error hook capture (global handler + unhandled rejection best effort)
- Export generation (`json`, `csv`, `json_gzip`, `csv_gzip`, `summary`)
- Local debug viewer snapshot via `debugSnapshot`

## Run

```bash
cd samples/react-native-chaos-app
npm install
npx expo prebuild
npm run ios
# or
npm run android
```

## Manual Flow

1. Tap mock actions and breadcrumb action.
2. Trigger JS exception and unhandled rejection actions.
3. Export logs and inspect generated file paths.
4. Relaunch app after a native hard crash test and verify pending report detection.
