import 'dart:async';

import 'package:flutter/widgets.dart';

import 'circlebox.dart';

/// A [NavigatorObserver] that automatically records screen-view events into
/// the CircleBox ring buffer whenever a route is pushed, popped, or replaced.
///
/// Add this observer to your [MaterialApp] or [Navigator] to get automatic
/// screen tracking with no per-screen instrumentation:
///
/// ```dart
/// MaterialApp(
///   navigatorObservers: [CircleBoxNavigatorObserver()],
///   ...
/// )
/// ```
///
/// Each navigation event produces a `screen_view` entry in the ring buffer
/// with the route name (or type when no name is set) and the navigation
/// action (`push`, `pop`, `replace`, `remove`).
class CircleBoxNavigatorObserver extends NavigatorObserver {
  /// Creates a [CircleBoxNavigatorObserver].
  ///
  /// [nameExtractor] customises how route names are derived from a [Route].
  /// Defaults to using `route.settings.name` and falling back to the runtime type.
  CircleBoxNavigatorObserver({NameExtractor? nameExtractor})
      : _nameExtractor = nameExtractor ?? _defaultNameExtractor;

  final NameExtractor _nameExtractor;

  static String _defaultNameExtractor(Route<dynamic> route) {
    final name = route.settings.name;
    if (name != null && name.isNotEmpty && name != '/') {
      return name;
    }
    return route.runtimeType.toString();
  }

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _record(route, 'push', previousRoute);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    if (previousRoute != null) {
      _record(previousRoute, 'pop', route);
    }
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    if (newRoute != null) {
      _record(newRoute, 'replace', oldRoute);
    }
  }

  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _record(route, 'remove', previousRoute);
  }

  void _record(Route<dynamic> route, String action, Route<dynamic>? from) {
    final name = _nameExtractor(route);
    final attrs = <String, String>{'nav_action': action};
    if (from != null) {
      attrs['from'] = _nameExtractor(from);
    }
    unawaited(CircleBox.screenView(name, attrs: attrs));
  }
}

/// Signature for a function that extracts a display name from a [Route].
typedef NameExtractor = String Function(Route<dynamic> route);
