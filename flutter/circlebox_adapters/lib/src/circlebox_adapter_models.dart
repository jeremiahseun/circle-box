class CircleBoxAdapterEvent {
  const CircleBoxAdapterEvent({
    required this.seq,
    required this.timestampUnixMs,
    required this.uptimeMs,
    required this.type,
    required this.thread,
    required this.severity,
    required this.attrs,
  });

  final int seq;
  final int timestampUnixMs;
  final int uptimeMs;
  final String type;
  final String thread;
  final String severity;
  final Map<String, String> attrs;
}

class CircleBoxAdapterEnvelope {
  const CircleBoxAdapterEnvelope({
    required this.schemaVersion,
    required this.sessionId,
    required this.platform,
    required this.appVersion,
    required this.buildNumber,
    required this.osVersion,
    required this.deviceModel,
    required this.exportSource,
    required this.captureReason,
    required this.generatedAtUnixMs,
    required this.events,
  });

  final int schemaVersion;
  final String sessionId;
  final String platform;
  final String appVersion;
  final String buildNumber;
  final String osVersion;
  final String deviceModel;
  final String exportSource;
  final String captureReason;
  final int generatedAtUnixMs;
  final List<CircleBoxAdapterEvent> events;
}

class CircleBoxSentryBreadcrumb {
  const CircleBoxSentryBreadcrumb({
    required this.category,
    required this.level,
    required this.message,
    required this.timestampUnixMs,
    required this.data,
  });

  final String category;
  final String level;
  final String message;
  final int timestampUnixMs;
  final Map<String, String> data;
}

class CircleBoxPostHogEvent {
  const CircleBoxPostHogEvent({
    required this.event,
    required this.properties,
  });

  final String event;
  final Map<String, Object?> properties;
}
