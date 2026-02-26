import { installReactNativeErrorHooks, uninstallReactNativeErrorHooks } from './errorHooks';
import { requireNativeModule } from './native';
import type {
  CircleBoxConfig,
  CircleBoxDebugEvent,
  CircleBoxErrorHookConfig,
  CircleBoxExportFormat,
  CircleBoxRealtimeOptions,
  CircleBoxSubscription,
} from './types';

const DEFAULT_EXPORT_FORMATS: CircleBoxExportFormat[] = ['json', 'csv'];
const realtimeListeners = new Map<number, { listener: (event: CircleBoxDebugEvent) => void; options: CircleBoxRealtimeOptions }>();
let realtimeListenerSeed = 1;
let realtimePollHandle: ReturnType<typeof setInterval> | null = null;
let realtimeLastSeq = -1;

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

  static addEventListener(
    listener: (event: CircleBoxDebugEvent) => void,
    options: CircleBoxRealtimeOptions = {},
  ): CircleBoxSubscription {
    const id = realtimeListenerSeed++;
    realtimeListeners.set(id, { listener, options });
    ensureRealtimePolling();
    void pollRealtimeEvents();

    return {
      remove: () => {
        realtimeListeners.delete(id);
        if (realtimeListeners.size === 0 && realtimePollHandle) {
          clearInterval(realtimePollHandle);
          realtimePollHandle = null;
        }
      },
    };
  }
}

export type CircleBoxSentryBreadcrumb = {
  category: string;
  level: string;
  message: string;
  timestamp_unix_ms: number;
  data: Record<string, string>;
};

export type CircleBoxPostHogEvent = {
  event: string;
  properties: Record<string, unknown>;
};

export type CircleBoxRealtimeForwarderConfig = CircleBoxRealtimeOptions & {
  sdkName?: string;
  postHogEventName?: string;
  onSentryBreadcrumb?: (breadcrumb: CircleBoxSentryBreadcrumb) => void | Promise<void>;
  onPostHogCapture?: (event: CircleBoxPostHogEvent) => void | Promise<void>;
};

export function mapEventToSentryBreadcrumb(
  event: CircleBoxDebugEvent,
  input: { sdkName?: string; mode?: string } = {},
): CircleBoxSentryBreadcrumb {
  const sdkName = input.sdkName ?? 'react-native';
  const mode = input.mode ?? 'realtime_adapter';
  return {
    category: `circlebox.${event.type}`,
    level: sentryLevelFor(event.severity),
    message: event.attrs.message ?? event.type,
    timestamp_unix_ms: event.timestamp_unix_ms,
    data: {
      thread: event.thread,
      severity: event.severity,
      circlebox_source: 'circlebox',
      circlebox_mode: mode,
      circlebox_sdk: sdkName,
      ...event.attrs,
    },
  };
}

export function mapEventToPostHog(
  event: CircleBoxDebugEvent,
  input: { sdkName?: string; eventName?: string } = {},
): CircleBoxPostHogEvent {
  const sdkName = input.sdkName ?? 'react-native';
  const eventName = input.eventName ?? 'circlebox_realtime_event';
  return {
    event: eventName,
    properties: {
      seq: event.seq,
      timestamp_unix_ms: event.timestamp_unix_ms,
      uptime_ms: event.uptime_ms,
      type: event.type,
      thread: event.thread,
      severity: event.severity,
      attrs_json: event.attrs,
      circlebox_source: 'circlebox',
      circlebox_mode: 'realtime_adapter',
      circlebox_sdk: sdkName,
    },
  };
}

export function attachRealtimeForwarders(config: CircleBoxRealtimeForwarderConfig): CircleBoxSubscription {
  const {
    sdkName = 'react-native',
    postHogEventName = 'circlebox_realtime_event',
    onSentryBreadcrumb,
    onPostHogCapture,
    ...realtimeOptions
  } = config;

  return CircleBox.addEventListener((event) => {
    if (onSentryBreadcrumb) {
      void Promise.resolve(
        onSentryBreadcrumb(
          mapEventToSentryBreadcrumb(event, {
            sdkName,
            mode: 'realtime_adapter',
          }),
        ),
      ).catch(() => {
        // Adapter sinks are best-effort and must not break app flows.
      });
    }
    if (onPostHogCapture) {
      void Promise.resolve(
        onPostHogCapture(
          mapEventToPostHog(event, {
            sdkName,
            eventName: postHogEventName,
          }),
        ),
      ).catch(() => {
        // Adapter sinks are best-effort and must not break app flows.
      });
    }
  }, realtimeOptions);
}

function ensureRealtimePolling(): void {
  if (realtimePollHandle) {
    return;
  }
  const intervalMs = Math.max(
    100,
    ...Array.from(realtimeListeners.values()).map((entry) => entry.options.pollIntervalMs ?? 500),
  );
  realtimePollHandle = setInterval(() => {
    void pollRealtimeEvents();
  }, intervalMs);
}

async function pollRealtimeEvents(): Promise<void> {
  if (realtimeListeners.size === 0) {
    return;
  }

  const maxEvents = Math.max(
    1,
    ...Array.from(realtimeListeners.values()).map((entry) => entry.options.maxEvents ?? 200),
  );
  let events: CircleBoxDebugEvent[] = [];
  try {
    events = await requireNativeModule().debugSnapshot(maxEvents);
  } catch {
    return;
  }

  for (const event of events) {
    if (event.seq <= realtimeLastSeq) {
      continue;
    }
    realtimeLastSeq = event.seq;
    realtimeListeners.forEach(({ listener, options }) => {
      if (!matchesRealtimeFilter(event, options)) {
        return;
      }
      try {
        listener(event);
      } catch {
        // Listener failures must never break polling.
      }
    });
  }
}

function matchesRealtimeFilter(event: CircleBoxDebugEvent, options: CircleBoxRealtimeOptions): boolean {
  if (options.includeEventTypes && options.includeEventTypes.length > 0) {
    if (!options.includeEventTypes.includes(event.type)) {
      return false;
    }
  }
  if (options.forwardAll) {
    return true;
  }
  if (event.type === 'breadcrumb' || event.type === 'native_exception_prehook') {
    return true;
  }
  return event.severity === 'warn' || event.severity === 'error' || event.severity === 'fatal';
}

function sentryLevelFor(severity: string): string {
  switch (severity) {
    case 'fatal':
      return 'fatal';
    case 'error':
      return 'error';
    case 'warn':
      return 'warning';
    default:
      return 'info';
  }
}

export type {
  CircleBoxConfig,
  CircleBoxDebugEvent,
  CircleBoxErrorHookConfig,
  CircleBoxExportFormat,
  CircleBoxRealtimeOptions,
  CircleBoxSubscription,
} from './types';
