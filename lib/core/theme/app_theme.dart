import 'package:flutter/material.dart';

class AppTheme {
  // Brand Harmonious Color Palette
  static const Color darkBg = Color(0xFF0B0F19);        // Rich Midnight Dark Blue
  static const Color darkCard = Color(0xFF161E2E);      // Deep Navy Slate for Cards
  static const Color primaryAmber = Color(0xFFF59E0B);  // Energetic Transportation Amber
  static const Color primaryOrange = Color(0xFFEF4444); // Premium Red/Orange Alert/Action
  static const Color accentTeal = Color(0xFF10B981);    // Emerald/Teal for Success/Paid
  static const Color textPrimary = Color(0xFFF3F4F6);   // Cool Grey 100
  static const Color textSecondary = Color(0xFF9CA3AF); // Cool Grey 400

  // Premium Dark Theme Config
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkBg,
      primaryColor: primaryAmber,
      colorScheme: const ColorScheme.dark(
        primary: primaryAmber,
        secondary: accentTeal,
        error: primaryOrange,
        background: darkBg,
        surface: darkCard,
        onPrimary: Colors.black,
        onSecondary: Colors.white,
      ),
      cardTheme: CardTheme(
        color: darkCard,
        elevation: 8,
        shadowColor: Colors.black.withOpacity(0.4),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(
            color: Colors.white.withOpacity(0.05),
            width: 1,
          ),
        ),
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: textPrimary, letterSpacing: -0.5),
        headlineMedium: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: textPrimary),
        titleLarge: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: textPrimary),
        bodyLarge: TextStyle(fontSize: 16, color: textPrimary, height: 1.5),
        bodyMedium: TextStyle(fontSize: 14, color: textSecondary, height: 1.4),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: darkBg,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: textPrimary),
        iconTheme: IconThemeData(color: primaryAmber),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryAmber,
          foregroundColor: Colors.black,
          elevation: 4,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.5,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: darkCard,
        labelStyle: const TextStyle(color: textSecondary),
        hintStyle: const TextStyle(color: textSecondary),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: primaryAmber, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: primaryOrange),
        ),
        contentPadding: const EdgeInsets.all(20),
      ),
    );
  }
}
