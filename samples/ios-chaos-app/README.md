# iOS Chaos App

This sample uses [XcodeGen](https://github.com/yonaskolb/XcodeGen) to generate the project.

## Generate and Run

```bash
cd samples/ios-chaos-app
xcodegen generate
open CircleBoxChaosApp.xcodeproj
```

## Flow

1. Tap several mock chaos buttons.
2. Tap **Hard Crash** or **Signal Crash (SIGABRT)**.
3. Re-open app.
4. Export logs and inspect JSON/CSV ordering.
