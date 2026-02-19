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
