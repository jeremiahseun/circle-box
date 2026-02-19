import { NativeModules, Platform } from 'react-native';

import type { CircleBoxDebugEvent, CircleBoxExportFormat } from './types';

interface CircleBoxNativeModule {
  start(config?: Record<string, unknown>): Promise<void>;
  breadcrumb(message: string, attrs?: Record<string, string>): Promise<void>;
  exportLogs(formats?: CircleBoxExportFormat[]): Promise<string[]>;
  hasPendingCrashReport(): Promise<boolean>;
  clearPendingCrashReport(): Promise<void>;
  debugSnapshot(maxEvents: number): Promise<CircleBoxDebugEvent[]>;
}

const LINKING_ERROR =
  `The package 'circlebox-react-native' is not linked. Ensure native installation is complete on ${Platform.OS}.`;

const Native = NativeModules.CircleBoxReactNative as CircleBoxNativeModule | undefined;

export function requireNativeModule(): CircleBoxNativeModule {
  if (!Native) {
    throw new Error(LINKING_ERROR);
  }
  return Native;
}
