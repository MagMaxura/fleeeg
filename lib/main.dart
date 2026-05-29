import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/constants/constants.dart';
import 'core/theme/app_theme.dart';
import 'core/utils/push_notification_service.dart';
import 'presentation/views/splash/splash_view.dart';

void main() async {
  // Ensure Flutter engine is initialized
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase safely
  await Supabase.initialize(
    url: AppConstants.supabaseUrl,
    anonKey: AppConstants.supabaseAnonKey,
  );

  // Initialize Push Notification Service gracefully in the background
  PushNotificationService().initialize();

  runApp(
    const ProviderScope(
      child: FleteenApp(),
    ),
  );
}

class FleteenApp extends StatelessWidget {
  const FleteenApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme, // Premium visual system
      home: const SplashView(), // Animated Entry Screen
    );
  }
}
