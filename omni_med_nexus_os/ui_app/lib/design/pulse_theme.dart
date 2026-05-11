import 'package:flutter/material.dart';

class PulseTheme {
  // Palettes
  static const Color mintGreenStart = Color(0xFFE0F7FA);
  static const Color mintGreenEnd = Color(0xFF80DEEA);
  static const Color deepBlueStart = Color(0xFF0F172A);
  static const Color deepPurpleEnd = Color(0xFF311B92);
  static const Color alertRed = Color(0xFFFF5252);
  static const Color alertYellow = Color(0xFFFFD740);
  static const Color alertGreen = Color(0xFF69F0AE);

  static BoxDecoration get mobileBackground => const BoxDecoration(
        gradient: LinearGradient(
          colors: [mintGreenStart, mintGreenEnd],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      );

  static BoxDecoration get desktopBackground => const BoxDecoration(
        gradient: LinearGradient(
          colors: [deepBlueStart, deepPurpleEnd],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      );
}
