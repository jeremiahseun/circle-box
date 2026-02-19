// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/widgets.dart';

import 'package:flutter_chaos_app/main.dart';

void main() {
  testWidgets('chaos app renders key sections', (WidgetTester tester) async {
    await tester.pumpWidget(const ChaosApp());
    await tester.pumpAndSettle();

    expect(find.text('CircleBox Flutter Chaos'), findsOneWidget);
    expect(find.text('Mock Context'), findsOneWidget);

    final scrollable = find.byType(Scrollable).first;
    await tester.scrollUntilVisible(find.text('Exports'), 300, scrollable: scrollable);
    expect(find.text('Exports'), findsOneWidget);

    await tester.scrollUntilVisible(find.text('Local Viewer'), 300, scrollable: scrollable);
    expect(find.text('Local Viewer'), findsOneWidget);
  });
}
