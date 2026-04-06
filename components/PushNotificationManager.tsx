import React, { useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseService';

const VAPID_PUBLIC_KEY = 'BGSeKS6yIpT8BY_czyDqICr-Lkm5yiLec4C0jctcRzzvUeLGtE7tUIqqWV6S_phOE0zrfx4fem2tEr7lWQraPS0';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

interface PushNotificationManagerProps {
    userId: string | undefined;
}

const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({ userId }) => {
    const subscribeUser = useCallback(async (registration: ServiceWorkerRegistration) => {
        try {
            const subscribeOptions = {
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            };

            const subscription = await registration.pushManager.subscribe(subscribeOptions);
            console.log('User is subscribed:', subscription);

            const key = subscription.getKey('p256dh');
            const token = subscription.getKey('auth');

            const p256dh = key ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(key)))) : '';
            const auth = token ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(token)))) : '';

            if (userId) {
                const { error } = await supabase
                    .from('push_subscriptions')
                    .upsert({
                        user_id: userId,
                        endpoint: subscription.endpoint,
                        p256dh_key: p256dh,
                        auth_key: auth
                    }, { onConflict: 'endpoint' });

                if (error) {
                    console.error('Error saving subscription to Supabase:', error);
                }
            }
        } catch (err) {
            console.error('Failed to subscribe the user: ', err);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            return;
        }

        navigator.serviceWorker.ready.then(registration => {
            // Check if already subscribed
            registration.pushManager.getSubscription().then(async subscription => {
                if (subscription) {
                    console.log('User is already subscribed');
                    // Optional: refresh subscription in database if needed
                    return;
                }

                // Request permission and subscribe if not subscribed
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    subscribeUser(registration);
                }
            });
        });
    }, [userId, subscribeUser]);

    return null; // This component doesn't render anything
};

export default PushNotificationManager;
