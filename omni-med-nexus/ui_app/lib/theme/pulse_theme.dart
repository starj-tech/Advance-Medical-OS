import 'package:flutter/material.dart';

class PulseDesignSystem {
  static const Color bluePrimary = Color(0xFF0080C8);
  static const Color cyanLight = Color(0xFF92DCE5);
  static const Color boneWhite = Color(0xFFF8F7F9);
  static const Color darkNavy = Color(0xFF2B2D42);
  static const Color greenOrganic = Color(0xFF2E8B57); // Green butterfly organic accent

  static ThemeData get themeData {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: boneWhite,
      colorScheme: const ColorScheme(
        brightness: Brightness.light,
        primary: bluePrimary,
        onPrimary: boneWhite,
        secondary: cyanLight,
        onSecondary: darkNavy,
        error: Colors.redAccent,
        onError: boneWhite,
        surface: Colors.white,
        onSurface: darkNavy,
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(color: darkNavy, fontWeight: FontWeight.bold),
        titleLarge: TextStyle(color: darkNavy, fontWeight: FontWeight.w600),
        bodyLarge: TextStyle(color: darkNavy),
        bodyMedium: TextStyle(color: darkNavy),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: bluePrimary,
          foregroundColor: boneWhite,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: boneWhite,
        foregroundColor: darkNavy,
        elevation: 0,
        centerTitle: false,
      ),
    );
  }
}
