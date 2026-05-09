import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui_app/main.dart';

void main() {
  testWidgets('Router Select UI renders', (WidgetTester tester) async {
    await tester.pumpWidget(const OmniMedNexusOS());
    expect(find.text('Login to Access Specific Clinical Clusters'), findsOneWidget);
  });
}
