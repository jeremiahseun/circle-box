export const platformInstallTargets = [
  { label: "Swift (SPM)", path: "/docs/ios-quickstart" },
  { label: "Kotlin (AAR)", path: "/docs/android-quickstart" },
  { label: "Flutter", path: "/docs/flutter-quickstart" },
  { label: "React Native", path: "/docs/react-native-quickstart" },
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
