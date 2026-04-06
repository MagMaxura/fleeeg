import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "https://esm.sh/web-push@3.6.7"

console.log("Hello from send-push-notification!")

serve(async (req) => {
    const { userId, title, body, url } = await req.json()

    // Supabase setup
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user subscriptions
    const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 400,
        })
    }

    if (!subscriptions || subscriptions.length === 0) {
        return new Response(JSON.stringify({ message: "No subscriptions found for user" }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        })
    }

    // VAPID keys from environment variables
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@fletapp.com'

    if (!vapidPublicKey || !vapidPrivateKey) {
        return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        })
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    const results = await Promise.all(
        subscriptions.map(async (sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh_key,
                    auth: sub.auth_key,
                },
            }

            try {
                await webpush.sendNotification(
                    pushSubscription,
                    JSON.stringify({ title, body, url })
                )
                return { success: true, endpoint: sub.endpoint }
            } catch (err) {
                console.error(`Error sending push to ${sub.endpoint}:`, err)
                // If subscription is expired or invalid, we should remove it
                if (err.statusCode === 404 || err.statusCode === 410) {
                    await supabase
                        .from('push_subscriptions')
                        .delete()
                        .eq('endpoint', sub.endpoint)
                }
                return { success: false, endpoint: sub.endpoint, error: err.message }
            }
        })
    )

    return new Response(JSON.stringify({ results }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
    })
})
