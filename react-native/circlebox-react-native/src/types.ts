export type CircleBoxExportFormat = 'json' | 'csv' | 'json_gzip' | 'csv_gzip' | 'summary';

export interface CircleBoxConfig {
  bufferCapacity?: number;
  jankThresholdMs?: number;
  sanitizeAttributes?: boolean;
  maxAttributeLength?: number;
  diskCheckIntervalSec?: number;
  enableSignalCrashCapture?: boolean;
  enableDebugViewer?: boolean;
  installReactNativeErrorHooks?: boolean;
  captureJsExceptions?: boolean;
  captureUnhandledRejections?: boolean;
}

export interface CircleBoxDebugEvent {
  seq: number;
  timestamp_unix_ms: number;
  uptime_ms: number;
  type: string;
  thread: 'main' | 'background' | 'crash' | string;
  severity: 'info' | 'warn' | 'error' | 'fatal' | string;
  attrs: Record<string, string>;
}

export interface CircleBoxErrorHookConfig {
  captureJsExceptions?: boolean;
  captureUnhandledRejections?: boolean;
}

export interface CircleBoxRealtimeOptions {
  forwardAll?: boolean;
  includeEventTypes?: string[];
  pollIntervalMs?: number;
  maxEvents?: number;
}

export interface CircleBoxSubscription {
  remove(): void;
}

/** Options for the React Navigation integration helper. */
export interface CircleBoxNavigationTrackerOptions {
  /** Extract a display name from the current route state. Defaults to the focused route name. */
  getRouteName?: (state: unknown) => string | undefined;
}

/** Minimal subset of the React Navigation NavigationContainerRef needed by the tracker. */
export interface NavigationContainerRefLike {
  getCurrentRoute(): { name: string; params?: Record<string, unknown> } | undefined;
}
