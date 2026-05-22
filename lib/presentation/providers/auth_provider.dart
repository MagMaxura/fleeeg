import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/profile_model.dart';
import '../../data/repositories/supabase_repository.dart';

class AuthState {
  final ProfileModel? profile;
  final bool isLoading;
  final String? errorMessage;

  AuthState({
    this.profile,
    this.isLoading = false,
    this.errorMessage,
  });

  AuthState copyWith({
    ProfileModel? profile,
    bool? isLoading,
    String? errorMessage,
  }) {
    return AuthState(
      profile: profile ?? this.profile,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final SupabaseRepository _repository;

  AuthNotifier(this._repository) : super(AuthState()) {
    // Fetch initial profile if user is already logged in
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final user = _repository.currentUser;
    if (user != null) {
      state = state.copyWith(isLoading: true);
      try {
        final profile = await _repository.getProfile(user.id);
        state = state.copyWith(profile: profile, isLoading: false);
      } catch (e) {
        state = state.copyWith(errorMessage: e.toString(), isLoading: false);
      }
    }
  }

  Future<bool> signIn(String email, String password) async {
    state = state.copyWith(isLoading: true);
    try {
      final response = await _repository.signIn(email, password);
      if (response.user != null) {
        final profile = await _repository.getProfile(response.user!.id);
        state = AuthState(profile: profile, isLoading: false);
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
      await _repository.signOut();
      state = AuthState();
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
      state = AuthState(profile: profile, isLoading: false);
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
