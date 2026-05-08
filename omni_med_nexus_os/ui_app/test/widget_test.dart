import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui_app/main.dart';

void main() {
  testWidgets('Dashboard UI renders correctly', (WidgetTester tester) async {
    await tester.pumpWidget(const OmniMedNexusOS());

    // Verify clinical navigation is present
    expect(find.text('Clinical (Doctor)'), findsOneWidget);

    // We mock FRB in real tests, but for now we just verify basic layout mounts
    expect(find.byType(BottomNavigationBar), findsOneWidget);
  });
}
