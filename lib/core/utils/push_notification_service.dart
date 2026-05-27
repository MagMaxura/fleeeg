import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // If you're going to use other Firebase services in the background,
  // make sure you call `Firebase.initializeApp()` first.
  await Firebase.initializeApp();
}

class PushNotificationService {
  static final PushNotificationService _instance = PushNotificationService._internal();
  factory PushNotificationService() => _instance;
  PushNotificationService._internal();

  FirebaseMessaging get _fcm => FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotificationsPlugin = FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  /// High importance notification channel for Android foreground alerts
  static const AndroidNotificationChannel _androidChannel = AndroidNotificationChannel(
    'fleteen_alerts_channel',
    'Alertas de Viajes y Mensajes',
    description: 'Notificaciones sobre nuevas cotizaciones, chats y actualizaciones del flete.',
    importance: Importance.max,
    playSound: true,
  );

  /// Initialize Firebase Messaging & Local Notifications for Foreground Displays
  Future<void> initialize() async {
    if (_initialized) return;

    try {
      // 1. Initialize Firebase Core gracefully
      // This will fail-safe if GoogleServices files are not added yet during sandbox testing
      await Firebase.initializeApp();

      // 2. Register background messaging handler
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // 3. Request user notification permissions (iOS & Android 13+)
      NotificationSettings settings = await _fcm.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        // 4. Setup Foreground Notification display configurations for iOS & Android
        await _setupForegroundNotifications();
        
        // 5. Start listening to messages
        _startListeningToMessages();
        
        _initialized = true;
      }
    } catch (e) {
      // Gracefully swallow initialization failures in simulated environments
      // without Firebase configurations.
    }
  }

  /// Setup local channels to show floating banners when app is running in foreground
  Future<void> _setupForegroundNotifications() async {
    // Setup Android integration
    await _localNotificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_androidChannel);

    // Initialise Flutter Local Notifications settings
    const AndroidInitializationSettings androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const DarwinInitializationSettings iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    const InitializationSettings initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotificationsPlugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse details) {
        // Handle clicking on foreground notification banner (open active trip details etc)
        _handleNotificationClick(details.payload);
      },
    );

    // Set iOS presentation options when app is in foreground
    await _fcm.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );
  }

  /// Listen to live push messages
  void _startListeningToMessages() {
    // 1. Foreground Message listener
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      RemoteNotification? notification = message.notification;
      AndroidNotification? android = message.notification?.android;

      if (notification != null && android != null) {
        _localNotificationsPlugin.show(
          notification.hashCode,
          notification.title,
          notification.body,
          NotificationDetails(
            android: AndroidNotificationDetails(
              _androidChannel.id,
              _androidChannel.name,
              channelDescription: _androidChannel.description,
              icon: '@mipmap/ic_launcher',
              importance: Importance.max,
              priority: Priority.high,
              playSound: true,
            ),
            iOS: const DarwinNotificationDetails(
              presentAlert: true,
              presentBadge: true,
              presentSound: true,
            ),
          ),
          payload: message.data['trip_id']?.toString(),
        );
      }
    });

    // 2. Opened from background state listener
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      _handleNotificationClick(message.data['trip_id']?.toString());
    });

    // 3. Opened from terminated state resolver
    _fcm.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        _handleNotificationClick(message.data['trip_id']?.toString());
      }
    });
  }

  /// Route the user to the correct trip detail page when they click the notification
  void _handleNotificationClick(String? tripId) {
    if (tripId == null) return;
    
    // We can broadcast or trigger dynamic page routing here to open the TripStatusView
    // For now we quietly consume or print for routing handling
  }

  /// Get and upload FCM registration token to Supabase profiles table
  Future<void> registerFcmToken() async {
    try {
      final token = await _fcm.getToken();
      final userId = Supabase.instance.client.auth.currentUser?.id;

      if (token != null && userId != null) {
        // Save token in fcm_token column in profiles table
        await Supabase.instance.client.from('profiles').update({
          'fcm_token': token,
        }).eq('id', userId);
      }
    } catch (e) {
      // Quietly swallow if database table is not deployed with fcm_token yet
    }
  }

  /// Remove FCM token from Supabase profile on Logout
  Future<void> unregisterFcmToken() async {
    try {
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId != null) {
        await Supabase.instance.client.from('profiles').update({
          'fcm_token': null,
        }).eq('id', userId);
      }
    } catch (e) {
      // Quietly consume
    }
  }
}
