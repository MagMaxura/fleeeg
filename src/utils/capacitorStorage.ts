import { Preferences } from '@capacitor/preferences';

// Native key-value storage adapter for Supabase auth.
// Uses NSUserDefaults (iOS) / SharedPreferences (Android) instead of WebView localStorage.
export const CapacitorStorage = {
    getItem: async (key: string): Promise<string | null> => {
        const { value } = await Preferences.get({ key });
        return value;
    },
    setItem: async (key: string, value: string): Promise<void> => {
        await Preferences.set({ key, value });
    },
    removeItem: async (key: string): Promise<void> => {
        await Preferences.remove({ key });
    },
};

export const getNativePreference = async (key: string): Promise<string | null> => {
    const { value } = await Preferences.get({ key });
    return value;
};

export const setNativePreference = async (key: string, value: string): Promise<void> => {
    await Preferences.set({ key, value });
};

export const removeNativePreference = async (key: string): Promise<void> => {
    await Preferences.remove({ key });
};
