import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui_app/main.dart';

void main() {
  testWidgets('Router UI renders correctly', (WidgetTester tester) async {
    await tester.pumpWidget(const OmniMedNexusOS());

    // Verify login is present
    expect(find.text('Login Sp.EM (ER)'), findsOneWidget);
  });
}
