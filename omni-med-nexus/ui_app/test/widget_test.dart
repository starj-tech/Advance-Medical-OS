import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ui_app/main.dart';

void main() {
  testWidgets('Dashboard renders correctly', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const OmniMedNexusOS());

    // Verify that our title is present.
    expect(find.text('Omni-Med Nexus OS'), findsWidgets);
    expect(find.text('Intelligent Pulse of Healthcare'), findsOneWidget);
  });
}
