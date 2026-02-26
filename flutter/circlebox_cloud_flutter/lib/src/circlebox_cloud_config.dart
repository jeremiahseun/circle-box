enum CircleBoxCloudUsageMode {
  offlineOnly('offline_only'),
  coreCloud('core_cloud'),
  coreAdapters('core_adapters'),
  coreCloudAdapters('core_cloud_adapters'),
  selfHost('self_host');

  const CircleBoxCloudUsageMode(this.wireValue);
  final String wireValue;
}

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
    this.enableUsageBeacon = false,
    this.usageBeaconKey,
    this.usageBeaconEndpoint,
    this.usageBeaconMode = CircleBoxCloudUsageMode.coreCloud,
    this.usageBeaconMinIntervalSec = 300,
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
  final bool enableUsageBeacon;
  final String? usageBeaconKey;
  final Uri? usageBeaconEndpoint;
  final CircleBoxCloudUsageMode usageBeaconMode;
  final int usageBeaconMinIntervalSec;
}
