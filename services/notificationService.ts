import { supabase } from './supabaseService';

export const createNotification = async (
  userId: string,
  title: string,
  body: string,
  type: 'new_offer' | 'offer_accepted' | 'chat_message' | 'offer_message' | 'trip_status',
  relatedTripId?: number | null,
  relatedOfferId?: number | null,
) => {
  try {
    await (supabase.from('notifications' as any) as any).insert({
      user_id: userId,
      title,
      body,
      type,
      related_trip_id: relatedTripId ?? null,
      related_offer_id: relatedOfferId ?? null,
    });
  } catch (e) {
    console.error('Error creating notification:', e);
  }
};
