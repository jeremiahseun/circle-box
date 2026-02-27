import { AppState, type AppStateStatus } from 'react-native';
import { CircleBox, type CircleBoxExportFormat } from 'circlebox-react-native';

declare const require: (name: string) => unknown;

export type CircleBoxCloudUsageMode =
  | 'offline_only'
  | 'core_cloud'
  | 'core_adapters'
  | 'core_cloud_adapters'
  | 'self_host';

export type CircleBoxCloudConfig = {
  endpoint: string;
  ingestKey: string;
  region?: 'us' | 'eu' | 'auto';
  enableFragmentSync?: boolean;
  flushIntervalSec?: number;
  maxQueueMb?: number;
  wifiOnly?: boolean;
  retryMaxBackoffSec?: number;
  enableAutoFlush?: boolean;
  autoExportPendingOnStart?: boolean;
  immediateFlushOnHighSignal?: boolean;
  enableUsageBeacon?: boolean;
  usageBeaconKey?: string;
  usageBeaconEndpoint?: string;
  usageBeaconMode?: CircleBoxCloudUsageMode;
  usageBeaconMinIntervalSec?: number;
};

type UploadTask = {
  id: string;
  endpointPath: 'v1/ingest/report' | 'v1/ingest/fragment';
  filePath: string;
  contentType: string;
  idempotencyKey: string;
  payloadBytes: number;
  createdUnixMs: number;
  attempts: number;
  nextAttemptUnixMs: number;
};

const QUEUE_STORAGE_KEY = 'circlebox_cloud_upload_queue_v1';
const USAGE_STATE_STORAGE_KEY = 'circlebox_cloud_usage_beacon_state_v1';
const SDK_VERSION = '0.3.1';

type UsageBeaconState = {
  usageDate: string;
  activeApps: number;
  crashReports: number;
  eventsEmitted: number;
  lastSentUnixMs: number;
};

type UsageSummaryIncrement = {
  crashReports: number;
  eventsEmitted: number;
};

type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

let config: CircleBoxCloudConfig | null = null;
let paused = false;
let queueCache: UploadTask[] | null = null;
let usageStateCache: UsageBeaconState | null = null;
let isProcessingQueue = false;
let isSendingUsageBeacon = false;
let appState: AppStateStatus = AppState.currentState ?? 'active';
let appStateSubscription: { remove: () => void } | null = null;
let flushIntervalHandle: ReturnType<typeof setInterval> | null = null;
let highSignalSubscription: { remove: () => void } | null = null;
let lastImmediateFlushUnixMs = 0;
const storage = resolveOptionalStorage();

export async function start(nextConfig: CircleBoxCloudConfig): Promise<void> {
  const sanitizedIngestKey = nextConfig.ingestKey.trim();
  if (!sanitizedIngestKey.startsWith('cb_live_')) {
    throw new Error('ingestKey must use cb_live_ prefix');
  }
  const sanitizedUsageKey = nextConfig.usageBeaconKey?.trim();
  if (sanitizedUsageKey && !sanitizedUsageKey.startsWith('cb_usage_')) {
    throw new Error('usageBeaconKey must use cb_usage_ prefix');
  }

  const flushIntervalSec = Math.max(10, nextConfig.flushIntervalSec ?? 15);
  const maxQueueMb = Math.max(1, nextConfig.maxQueueMb ?? 20);
  const retryMaxBackoffSec = Math.max(30, nextConfig.retryMaxBackoffSec ?? 900);
  const usageBeaconMinIntervalSec = Math.max(30, nextConfig.usageBeaconMinIntervalSec ?? 300);
  const normalizedNextConfig: CircleBoxCloudConfig = {
    ...nextConfig,
    ingestKey: sanitizedIngestKey,
    usageBeaconKey: sanitizedUsageKey,
    flushIntervalSec,
    maxQueueMb,
    retryMaxBackoffSec,
    usageBeaconMinIntervalSec,
  };

  config = {
    region: 'auto',
    enableFragmentSync: true,
    flushIntervalSec: 15,
    maxQueueMb: 20,
    wifiOnly: false,
    retryMaxBackoffSec: 900,
    enableAutoFlush: true,
    autoExportPendingOnStart: true,
    immediateFlushOnHighSignal: true,
    enableUsageBeacon: false,
    usageBeaconMode: 'core_cloud',
    usageBeaconMinIntervalSec: 300,
    ...normalizedNextConfig,
  };
  paused = false;
  await loadQueue();
  await loadUsageState();
  recordUsageStart(config);
  await saveUsageState(usageStateCache ?? defaultUsageState());
  ensureAppStateListener();
  configureAutoFlushTimer();
  configureHighSignalListener();
  await runForegroundDrain(Boolean(config.autoExportPendingOnStart));
}

export async function pause(): Promise<void> {
  paused = true;
  stopAutoFlushTimer();
}

export async function resume(): Promise<void> {
  paused = false;
  configureAutoFlushTimer();
  await runForegroundDrain(true);
}

export async function setUser(id: string, attrs: Record<string, string> = {}): Promise<void> {
  await CircleBox.breadcrumb('cloud_user_context', { ...attrs, user_id: id });
}

export async function captureAction(name: string, attrs: Record<string, string> = {}): Promise<void> {
  await CircleBox.breadcrumb('ui_action', { ...attrs, action_name: name });
}

export async function flush(): Promise<string[]> {
  if (!config) {
    throw new Error('circlebox-cloud-react-native start() must be called first');
  }
  if (paused) {
    return [];
  }

  const formats: CircleBoxExportFormat[] = ['summary', 'json_gzip'];
  const paths = await CircleBox.exportLogs(formats);

  await enqueuePaths(paths, config.maxQueueMb ?? 20);
  await processQueue(config);

  return paths;
}

async function runForegroundDrain(checkPendingCrash: boolean): Promise<void> {
  const localConfig = config;
  if (!localConfig || paused) {
    return;
  }

  if (checkPendingCrash) {
    let hasPendingCrash = false;
    try {
      hasPendingCrash = await CircleBox.hasPendingCrashReport();
    } catch {
      hasPendingCrash = false;
    }
    if (hasPendingCrash) {
      try {
        await flush();
      } catch {
        // Keep background behavior non-throwing.
      }
      await sendUsageBeaconIfNeeded(false, localConfig);
      return;
    }
  }

  if (localConfig.enableAutoFlush) {
    await processQueue(localConfig);
  }
  await sendUsageBeaconIfNeeded(false, localConfig);
}

function ensureAppStateListener(): void {
  if (appStateSubscription) {
    return;
  }

  appState = AppState.currentState ?? 'active';
  appStateSubscription = AppState.addEventListener('change', (nextState) => {
    appState = nextState;
    if (nextState === 'active') {
      configureAutoFlushTimer();
      void runForegroundDrain(true);
    } else {
      stopAutoFlushTimer();
    }
  });
}

function configureAutoFlushTimer(): void {
  const localConfig = config;
  if (!localConfig || paused || !localConfig.enableAutoFlush || appState !== 'active') {
    stopAutoFlushTimer();
    return;
  }
  if (flushIntervalHandle) {
    return;
  }

  const intervalMs = Math.max(10, localConfig.flushIntervalSec ?? 60) * 1000;
  flushIntervalHandle = setInterval(() => {
    const current = config;
    if (!current || paused || !current.enableAutoFlush || appState !== 'active') {
      return;
    }
    void processQueue(current);
  }, intervalMs);
}

function configureHighSignalListener(): void {
  const localConfig = config;
  if (!localConfig || !localConfig.immediateFlushOnHighSignal) {
    highSignalSubscription?.remove();
    highSignalSubscription = null;
    return;
  }
  if (highSignalSubscription) {
    return;
  }

  highSignalSubscription = CircleBox.addEventListener((event) => {
    if (!isHighSignalEvent(event)) {
      return;
    }
    if (paused || !config?.immediateFlushOnHighSignal) {
      return;
    }
    const now = nowMs();
    if ((now - lastImmediateFlushUnixMs) < 2_000) {
      return;
    }
    lastImmediateFlushUnixMs = now;
    void flushForHighSignal();
  }, {
    forwardAll: true,
    pollIntervalMs: 400,
    maxEvents: 200,
  });
}

async function flushForHighSignal(): Promise<void> {
  try {
    await flush();
  } catch {
    // Keep high-signal immediate flush best-effort and non-throwing.
  }
  await sendUsageBeaconIfNeeded(false);
}

function isHighSignalEvent(event: { type: string; severity: string }): boolean {
  if (event.type === 'native_exception_prehook') {
    return true;
  }
  return event.severity === 'error' || event.severity === 'fatal';
}

function stopAutoFlushTimer(): void {
  if (flushIntervalHandle) {
    clearInterval(flushIntervalHandle);
    flushIntervalHandle = null;
  }
}

async function enqueuePaths(paths: string[], maxQueueMb: number): Promise<void> {
  const queue = await loadQueue();
  for (const path of paths) {
    // eslint-disable-next-line no-await-in-loop
    const payload = await readFilePayload(path);
    const endpointPath = path.endsWith('summary.json') ? 'v1/ingest/fragment' : 'v1/ingest/report';
    const contentType = path.endsWith('.gz') ? 'application/json+gzip' : 'application/json';
    const idempotencyKey = buildIdempotencyKey(endpointPath, payload.bytes);
    if (queue.some((task) => task.idempotencyKey === idempotencyKey)) {
      continue;
    }

    queue.push({
      id: nextTaskId(),
      endpointPath,
      filePath: path,
      contentType,
      idempotencyKey,
      payloadBytes: payload.bytes.byteLength,
      createdUnixMs: nowMs(),
      attempts: 0,
      nextAttemptUnixMs: nowMs(),
    });
  }

  trimQueue(queue, Math.max(1, maxQueueMb) * 1024 * 1024);
  await saveQueue(queue);
}

async function processQueue(localConfig: CircleBoxCloudConfig): Promise<void> {
  if (isProcessingQueue) {
    return;
  }
  isProcessingQueue = true;

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (paused) {
        break;
      }

      const queue = await loadQueue();
      const task = nextReadyTask(queue);
      if (!task) {
        break;
      }

      let payload: FilePayload;
      try {
        // eslint-disable-next-line no-await-in-loop
        payload = await readFilePayload(task.filePath);
      } catch {
        removeTask(queue, task.id);
        // eslint-disable-next-line no-await-in-loop
        await saveQueue(queue);
        // eslint-disable-next-line no-continue
        continue;
      }

      const summaryIncrement =
        task.endpointPath === 'v1/ingest/fragment'
          ? parseUsageSummaryIncrement(payload.bytes)
          : null;

      const endpoint = combineEndpoint(localConfig.endpoint, task.endpointPath);
      // eslint-disable-next-line no-await-in-loop
      const outcome = await uploadOnce(
        endpoint,
        localConfig.ingestKey,
        task.idempotencyKey,
        task.contentType,
        payload.body,
      );

      if (outcome === 'success') {
        removeTask(queue, task.id);
        if (summaryIncrement) {
          applyUsageSummaryIncrement(localConfig, summaryIncrement);
          // eslint-disable-next-line no-await-in-loop
          await saveUsageState(usageStateCache ?? defaultUsageState());
        }
      } else if (outcome === 'retryable') {
        rescheduleTask(queue, task.id, localConfig.retryMaxBackoffSec ?? 900);
      } else {
        removeTask(queue, task.id);
      }

      // eslint-disable-next-line no-await-in-loop
      await saveQueue(queue);
      if (outcome === 'success' && summaryIncrement) {
        // eslint-disable-next-line no-await-in-loop
        await sendUsageBeaconIfNeeded(false, localConfig);
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

async function uploadOnce(
  endpoint: string,
  ingestKey: string,
  idempotencyKey: string,
  contentType: string,
  body: unknown,
): Promise<'success' | 'retryable' | 'permanent'> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-circlebox-ingest-key': ingestKey,
        'x-circlebox-idempotency-key': idempotencyKey,
        'content-type': contentType,
      },
      body: body as never,
    });

    if (response.ok) {
      return 'success';
    }
    if (isRetryableStatus(response.status)) {
      return 'retryable';
    }
    return 'permanent';
  } catch {
    return 'retryable';
  }
}

function isRetryableStatus(status: number): boolean {
  if (status >= 500) {
    return true;
  }
  return status === 408 || status === 409 || status === 425 || status === 429;
}

function nextReadyTask(queue: UploadTask[]): UploadTask | null {
  const now = nowMs();
  const ready = queue
    .filter((task) => task.nextAttemptUnixMs <= now)
    .sort((a, b) => a.createdUnixMs - b.createdUnixMs);
  return ready.length > 0 ? ready[0] : null;
}

function rescheduleTask(queue: UploadTask[], id: string, maxBackoffSec: number): void {
  const index = queue.findIndex((task) => task.id === id);
  if (index < 0) {
    return;
  }
  const attempts = queue[index].attempts + 1;
  queue[index] = {
    ...queue[index],
    attempts,
    nextAttemptUnixMs: nextAttemptUnixMs(attempts, maxBackoffSec),
  };
}

function removeTask(queue: UploadTask[], id: string): void {
  const index = queue.findIndex((task) => task.id === id);
  if (index >= 0) {
    queue.splice(index, 1);
  }
}

function trimQueue(queue: UploadTask[], maxBytes: number): void {
  let total = queue.reduce((acc, task) => acc + task.payloadBytes, 0);
  while (total > maxBytes && queue.length > 0) {
    queue.sort((a, b) => a.createdUnixMs - b.createdUnixMs);
    const removed = queue.shift();
    if (!removed) {
      break;
    }
    total -= removed.payloadBytes;
  }
}

function nextAttemptUnixMs(attempts: number, maxBackoffSec: number): number {
  const base = Math.min(2 ** Math.max(0, attempts - 1), Math.max(1, maxBackoffSec));
  const jitter = Math.random() * (base * 0.25);
  const delayMs = Math.max(100, Math.round((base + jitter) * 1000));
  return nowMs() + delayMs;
}

function nowMs(): number {
  return Date.now();
}

function combineEndpoint(base: string, endpointPath: string): string {
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalizedBase}/${endpointPath}`;
}

function nextTaskId(): string {
  return `task_${Date.now()}_${Math.floor(Math.random() * 1_000_000_000)}`;
}

type FilePayload = {
  body: unknown;
  bytes: Uint8Array;
};

async function readFilePayload(path: string): Promise<FilePayload> {
  const normalized = path.startsWith('file://') ? path : `file://${path}`;
  const response = await fetch(normalized);
  if (!response.ok) {
    throw new Error(`Failed to read file ${path}`);
  }

  const arrayBufferFn = (response as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer;
  if (typeof arrayBufferFn === 'function') {
    const buffer = await arrayBufferFn.call(response);
    return {
      body: buffer,
      bytes: new Uint8Array(buffer),
    };
  }

  const text = await response.text();
  const bytes = stringToBytes(text);
  return {
    body: text,
    bytes,
  };
}

function buildIdempotencyKey(endpointPath: string, bytes: Uint8Array): string {
  const endpointBytes = stringToBytes(endpointPath);
  const combinedA = concatBytes(endpointBytes, bytes);
  const combinedB = concatBytes(bytes, endpointBytes);
  const h1 = fnv1a(combinedA).toString(16).padStart(8, '0');
  const h2 = fnv1a(combinedB).toString(16).padStart(8, '0');
  return `cb_${h1}${h2}_${bytes.byteLength.toString(16)}`;
}

function fnv1a(bytes: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i += 1) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function stringToBytes(value: string): Uint8Array {
  const out = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) {
    out[i] = value.charCodeAt(i) & 0xff;
  }
  return out;
}

async function sendUsageBeaconIfNeeded(
  force: boolean,
  localConfig: CircleBoxCloudConfig | null = config,
): Promise<void> {
  if (
    !localConfig ||
    isSendingUsageBeacon ||
    !localConfig.enableUsageBeacon ||
    !localConfig.usageBeaconKey ||
    localConfig.usageBeaconKey.trim().length === 0
  ) {
    return;
  }

  const state = normalizeUsageState(usageStateCache ?? defaultUsageState());
  usageStateCache = state;
  const minIntervalMs = Math.max(30, localConfig.usageBeaconMinIntervalSec ?? 300) * 1000;
  if (!force && nowMs() - state.lastSentUnixMs < minIntervalMs) {
    return;
  }

  isSendingUsageBeacon = true;
  const endpoint = combineEndpoint(localConfig.usageBeaconEndpoint ?? localConfig.endpoint, 'v1/telemetry/usage');

  let success = false;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-circlebox-usage-key': localConfig.usageBeaconKey.trim(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sdk_family: 'react_native',
        sdk_version: SDK_VERSION,
        mode: normalizeUsageMode(localConfig.usageBeaconMode),
        usage_date: state.usageDate,
        active_apps: state.activeApps,
        crash_reports: state.crashReports,
        events_emitted: state.eventsEmitted,
      }),
    });
    success = response.ok;
  } catch {
    success = false;
  } finally {
    isSendingUsageBeacon = false;
  }

  if (success) {
    usageStateCache = {
      ...state,
      lastSentUnixMs: nowMs(),
    };
    await saveUsageState(usageStateCache);
  }
}

function parseUsageSummaryIncrement(bytes: Uint8Array): UsageSummaryIncrement | null {
  try {
    const decoded = JSON.parse(bytesToString(bytes)) as Record<string, unknown>;
    const totalEventsRaw = decoded.total_events;
    const totalEvents =
      typeof totalEventsRaw === 'number' && Number.isFinite(totalEventsRaw)
        ? Math.max(0, Math.floor(totalEventsRaw))
        : 0;
    const crashReports = decoded.crash_event_present === true ? 1 : 0;
    return {
      crashReports,
      eventsEmitted: totalEvents,
    };
  } catch {
    return null;
  }
}

function applyUsageSummaryIncrement(
  localConfig: CircleBoxCloudConfig,
  increment: UsageSummaryIncrement,
): void {
  if (!localConfig.enableUsageBeacon) {
    return;
  }
  const current = normalizeUsageState(usageStateCache ?? defaultUsageState());
  usageStateCache = {
    ...current,
    crashReports: current.crashReports + Math.max(0, increment.crashReports),
    eventsEmitted: current.eventsEmitted + Math.max(0, increment.eventsEmitted),
  };
}

function recordUsageStart(localConfig: CircleBoxCloudConfig): void {
  if (!localConfig.enableUsageBeacon) {
    return;
  }
  const current = normalizeUsageState(usageStateCache ?? defaultUsageState());
  usageStateCache = {
    ...current,
    activeApps: current.activeApps + 1,
  };
}

async function loadUsageState(): Promise<UsageBeaconState> {
  if (usageStateCache) {
    return usageStateCache;
  }

  if (!storage) {
    usageStateCache = defaultUsageState();
    return usageStateCache;
  }

  const raw = await storage.getItem(USAGE_STATE_STORAGE_KEY);
  if (!raw) {
    usageStateCache = defaultUsageState();
    return usageStateCache;
  }

  try {
    const decoded = JSON.parse(raw) as unknown;
    if (!decoded || typeof decoded !== 'object') {
      usageStateCache = defaultUsageState();
      return usageStateCache;
    }
    const obj = decoded as Record<string, unknown>;
    usageStateCache = normalizeUsageState({
      usageDate: typeof obj.usageDate === 'string' ? obj.usageDate : currentUsageDate(),
      activeApps: typeof obj.activeApps === 'number' ? Math.max(0, Math.floor(obj.activeApps)) : 0,
      crashReports: typeof obj.crashReports === 'number' ? Math.max(0, Math.floor(obj.crashReports)) : 0,
      eventsEmitted: typeof obj.eventsEmitted === 'number' ? Math.max(0, Math.floor(obj.eventsEmitted)) : 0,
      lastSentUnixMs:
        typeof obj.lastSentUnixMs === 'number' ? Math.max(0, Math.floor(obj.lastSentUnixMs)) : 0,
    });
    return usageStateCache;
  } catch {
    usageStateCache = defaultUsageState();
    return usageStateCache;
  }
}

async function saveUsageState(state: UsageBeaconState): Promise<void> {
  usageStateCache = state;
  if (!storage) {
    return;
  }
  await storage.setItem(USAGE_STATE_STORAGE_KEY, JSON.stringify(state));
}

function defaultUsageState(): UsageBeaconState {
  return {
    usageDate: currentUsageDate(),
    activeApps: 0,
    crashReports: 0,
    eventsEmitted: 0,
    lastSentUnixMs: 0,
  };
}

function normalizeUsageState(state: UsageBeaconState): UsageBeaconState {
  const today = currentUsageDate();
  if (state.usageDate === today) {
    return state;
  }
  return defaultUsageState();
}

function currentUsageDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeUsageMode(mode: CircleBoxCloudUsageMode | undefined): CircleBoxCloudUsageMode {
  switch (mode) {
    case 'offline_only':
    case 'core_cloud':
    case 'core_adapters':
    case 'core_cloud_adapters':
    case 'self_host':
      return mode;
    default:
      return 'core_cloud';
  }
}

function bytesToString(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

async function loadQueue(): Promise<UploadTask[]> {
  if (queueCache) {
    return queueCache;
  }

  if (!storage) {
    queueCache = [];
    return queueCache;
  }

  const raw = await storage.getItem(QUEUE_STORAGE_KEY);
  if (!raw) {
    queueCache = [];
    return queueCache;
  }

  try {
    const decoded = JSON.parse(raw) as unknown;
    if (!Array.isArray(decoded)) {
      queueCache = [];
      return queueCache;
    }
    queueCache = decoded.map(normalizeTask).filter((task): task is UploadTask => task !== null);
    return queueCache;
  } catch {
    queueCache = [];
    return queueCache;
  }
}

async function saveQueue(queue: UploadTask[]): Promise<void> {
  queueCache = queue;
  if (!storage) {
    return;
  }
  await storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

function normalizeTask(input: unknown): UploadTask | null {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const obj = input as Record<string, unknown>;
  const endpointPathRaw = obj.endpointPath;
  const endpointPath = endpointPathRaw === 'v1/ingest/fragment' ? 'v1/ingest/fragment' : 'v1/ingest/report';

  const filePath = typeof obj.filePath === 'string' ? obj.filePath : '';
  const idempotencyKey = typeof obj.idempotencyKey === 'string' ? obj.idempotencyKey : '';
  if (!filePath || !idempotencyKey) {
    return null;
  }

  return {
    id: typeof obj.id === 'string' ? obj.id : nextTaskId(),
    endpointPath,
    filePath,
    contentType: typeof obj.contentType === 'string' ? obj.contentType : 'application/json',
    idempotencyKey,
    payloadBytes: typeof obj.payloadBytes === 'number' ? obj.payloadBytes : 0,
    createdUnixMs: typeof obj.createdUnixMs === 'number' ? obj.createdUnixMs : nowMs(),
    attempts: typeof obj.attempts === 'number' ? obj.attempts : 0,
    nextAttemptUnixMs: typeof obj.nextAttemptUnixMs === 'number' ? obj.nextAttemptUnixMs : nowMs(),
  };
}

function resolveOptionalStorage(): StorageLike | null {
  try {
    const loaded = require('@react-native-async-storage/async-storage') as {
      default?: StorageLike;
    } | StorageLike;
    const candidate = (loaded as { default?: StorageLike }).default ?? (loaded as StorageLike);
    if (
      candidate &&
      typeof candidate.getItem === 'function' &&
      typeof candidate.setItem === 'function'
    ) {
      return candidate;
    }
    return null;
  } catch {
    return null;
  }
}
