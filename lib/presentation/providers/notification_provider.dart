import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:audioplayers/audioplayers.dart';

class NotificationState {
  final List<Map<String, dynamic>> notificationsList;
  final bool hasUnread;

  NotificationState({
    this.notificationsList = const [],
    this.hasUnread = false,
  });

  NotificationState copyWith({
    List<Map<String, dynamic>>? notificationsList,
    bool? hasUnread,
  }) {
    return NotificationState(
      notificationsList: notificationsList ?? this.notificationsList,
      hasUnread: hasUnread ?? this.hasUnread,
    );
  }
}

class NotificationNotifier extends StateNotifier<NotificationState> {
  final AudioPlayer _audioPlayer = AudioPlayer();

  NotificationNotifier() : super(NotificationState());

  Future<void> addNotification({
    required String title,
    required String body,
    required String type,
  }) async {
    // Play modern transportation horn sound (as in original React code)
    try {
      await _audioPlayer.play(UrlSource('https://bigsoundbank.com/UPLOAD/mp3/0253.mp3'));
    } catch (e) {
      // Fallback silent failure if network is off or source has changed
    }

    final newNotification = {
      'title': title,
      'body': body,
      'type': type,
      'time': DateTime.now(),
      'is_read': false,
    };

    state = state.copyWith(
      notificationsList: [newNotification, ...state.notificationsList],
      hasUnread: true,
    );
  }

  void markAllAsRead() {
    final updatedList = state.notificationsList.map((n) {
      return {...n, 'is_read': true};
    }).toList();

    state = state.copyWith(
      notificationsList: updatedList,
      hasUnread: false,
    );
  }

  @override
  void dispose() {
    _audioPlayer.dispose();
    super.dispose();
  }
}

// Global notification provider
final notificationProvider = StateNotifierProvider<NotificationNotifier, NotificationState>((ref) {
  return NotificationNotifier();
});
