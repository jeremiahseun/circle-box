import { installReactNativeErrorHooks, uninstallReactNativeErrorHooks } from './errorHooks';
import { requireNativeModule } from './native';
import type {
  CircleBoxConfig,
  CircleBoxDebugEvent,
  CircleBoxErrorHookConfig,
  CircleBoxExportFormat,
} from './types';

const DEFAULT_EXPORT_FORMATS: CircleBoxExportFormat[] = ['json', 'csv'];

function toNativeConfig(config: CircleBoxConfig): Record<string, unknown> {
  const {
    installReactNativeErrorHooks: _installErrorHooks,
    captureJsExceptions: _captureJsExceptions,
    captureUnhandledRejections: _captureUnhandledRejections,
    ...nativeConfig
  } = config;

  return nativeConfig;
}

export class CircleBox {
  static async start(config: CircleBoxConfig = {}): Promise<void> {
    await requireNativeModule().start(toNativeConfig(config));

    if (config.installReactNativeErrorHooks ?? true) {
      this.installErrorHooks({
        captureJsExceptions: config.captureJsExceptions,
        captureUnhandledRejections: config.captureUnhandledRejections,
      });
    }
  }

  static async breadcrumb(message: string, attrs: Record<string, string> = {}): Promise<void> {
    await requireNativeModule().breadcrumb(message, attrs);
  }

  static async exportLogs(
    formats: CircleBoxExportFormat[] = DEFAULT_EXPORT_FORMATS,
  ): Promise<string[]> {
    return requireNativeModule().exportLogs(formats);
  }

  static async hasPendingCrashReport(): Promise<boolean> {
    return requireNativeModule().hasPendingCrashReport();
  }

  static async clearPendingCrashReport(): Promise<void> {
    await requireNativeModule().clearPendingCrashReport();
  }

  static async debugSnapshot(maxEvents = 200): Promise<CircleBoxDebugEvent[]> {
    return requireNativeModule().debugSnapshot(maxEvents);
  }

  static installErrorHooks(config: CircleBoxErrorHookConfig = {}): void {
    installReactNativeErrorHooks((message, attrs) => this.breadcrumb(message, attrs), config);
  }

  static uninstallErrorHooks(): void {
    uninstallReactNativeErrorHooks();
  }
}

export type {
  CircleBoxConfig,
  CircleBoxDebugEvent,
  CircleBoxErrorHookConfig,
  CircleBoxExportFormat,
} from './types';
