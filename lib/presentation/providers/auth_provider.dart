import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/models/profile_model.dart';
import '../../data/repositories/supabase_repository.dart';
import '../../core/utils/push_notification_service.dart';

class AuthState {
  final ProfileModel? profile;
  final bool isLoading;
  final String? errorMessage;
  final bool isInitialized;

  AuthState({
    this.profile,
    this.isLoading = false,
    this.errorMessage,
    this.isInitialized = false,
  });

  AuthState copyWith({
    ProfileModel? profile,
    bool? isLoading,
    String? errorMessage,
    bool? isInitialized,
  }) {
    return AuthState(
      profile: profile ?? this.profile,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      isInitialized: isInitialized ?? this.isInitialized,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final SupabaseRepository _repository;
  StreamSubscription? _authSubscription;

  AuthNotifier(this._repository) : super(AuthState(isInitialized: false)) {
    // Listen to real-time auth state changes to persist and auto-login
    _authSubscription = _repository.onAuthStateChange.listen((data) {
      final session = data.session;
      if (session != null) {
        _loadProfileForUser(session.user.id);
      } else {
        state = AuthState(isInitialized: true);
      }
    });
  }

  Future<void> _loadProfileForUser(String userId) async {
    state = state.copyWith(isLoading: true);
    try {
      final profile = await _repository.getProfile(userId);
      state = state.copyWith(profile: profile, isLoading: false, isInitialized: true);
      PushNotificationService().registerFcmToken();
    } catch (e) {
      state = state.copyWith(errorMessage: e.toString(), isLoading: false, isInitialized: true);
    }
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  Future<bool> signIn(String email, String password) async {
    state = state.copyWith(isLoading: true);
    try {
      final response = await _repository.signIn(email, password);
      if (response.user != null) {
        final profile = await _repository.getProfile(response.user!.id);
        state = AuthState(profile: profile, isLoading: false, isInitialized: true);
        PushNotificationService().registerFcmToken();
        return true;
      }
      state = state.copyWith(isLoading: false, errorMessage: 'Credenciales inválidas');
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  Future<void> signOut() async {
    state = state.copyWith(isLoading: true);
    try {
      await PushNotificationService().unregisterFcmToken();
      await _repository.signOut();
      state = AuthState(isInitialized: true);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<bool> completeOnboarding({
    required String role,
    required String fullName,
    required String dni,
    String? vehicleDetails,
    String? patent,
  }) async {
    state = state.copyWith(isLoading: true);
    try {
      final profile = await _repository.completeRegistration(
        role: role,
        fullName: fullName,
        dni: dni,
        vehicleDetails: vehicleDetails,
        patent: patent,
      );
      state = AuthState(profile: profile, isLoading: false, isInitialized: true);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }
}

// Global Providers
final supabaseRepositoryProvider = Provider<SupabaseRepository>((ref) {
  return SupabaseRepository();
});

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repository = ref.read(supabaseRepositoryProvider);
  return AuthNotifier(repository);
});
