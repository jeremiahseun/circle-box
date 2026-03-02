export const platformInstallTargets = [
  { label: "Swift", path: "/docs/ios-quickstart", sub: "(SPM)", icon: "swift" },
  { label: "Kotlin", path: "/docs/android-quickstart", sub: "(AAR)", icon: "kotlin" },
  { label: "Flutter", path: "/docs/flutter-quickstart", sub: "(Dart)", icon: "flutter" },
  { label: "React Native", path: "/docs/react-native-quickstart", sub: "(NPM)", icon: "react" },
] as const;

export const comparisonRows = [
  {
    capability: "Native environmental crash context (ring buffer)",
    circlebox: "Built-in",
    genericTools: "Partial, app-level breadcrumbs",
  },
  {
    capability: "Crash-time pending report recovery after hard crash",
    circlebox: "Built-in pending export recovery",
    genericTools: "Varies by SDK",
  },
  {
    capability: "Dependency-free core SDKs",
    circlebox: "Yes, adapters are optional",
    genericTools: "Often tied to vendor backend",
  },
  {
    capability: "Cloud ingest and downloadable raw reports",
    circlebox: "Worker + R2 + dashboard",
    genericTools: "Vendor-managed only",
  },
] as const;
