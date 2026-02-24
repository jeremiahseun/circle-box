class CircleBoxCloudConfig {
  const CircleBoxCloudConfig({
    required this.endpoint,
    required this.ingestKey,
    this.region = 'auto',
    this.enableFragmentSync = true,
    this.flushIntervalSec = 60,
    this.maxQueueMb = 20,
    this.wifiOnly = false,
    this.retryMaxBackoffSec = 900,
    this.enableAutoFlush = true,
    this.autoExportPendingOnStart = true,
  });

  final Uri endpoint;
  final String ingestKey;
  final String region;
  final bool enableFragmentSync;
  final int flushIntervalSec;
  final int maxQueueMb;
  final bool wifiOnly;
  final int retryMaxBackoffSec;
  final bool enableAutoFlush;
  final bool autoExportPendingOnStart;
}
