/// Runtime configuration passed to native CircleBox SDKs.
class CircleBoxConfig {
  const CircleBoxConfig({
    this.bufferCapacity = 50,
    this.jankThresholdMs = 200,
    this.sanitizeAttributes = true,
    this.maxAttributeLength = 256,
    this.diskCheckIntervalSec = 60,
    this.installFlutterErrorHooks = true,
    this.captureSilentFlutterErrors = false,
    this.captureCurrentIsolateErrors = true,
  });

  final int bufferCapacity;
  final int jankThresholdMs;
  final bool sanitizeAttributes;
  final int maxAttributeLength;
  final int diskCheckIntervalSec;
  final bool installFlutterErrorHooks;
  final bool captureSilentFlutterErrors;
  final bool captureCurrentIsolateErrors;

  /// Converts the config into a method-channel payload.
  Map<String, Object> toMap() {
    return {
      'bufferCapacity': bufferCapacity,
      'jankThresholdMs': jankThresholdMs,
      'sanitizeAttributes': sanitizeAttributes,
      'maxAttributeLength': maxAttributeLength,
      'diskCheckIntervalSec': diskCheckIntervalSec,
      'installFlutterErrorHooks': installFlutterErrorHooks,
      'captureSilentFlutterErrors': captureSilentFlutterErrors,
      'captureCurrentIsolateErrors': captureCurrentIsolateErrors,
    };
  }
}
