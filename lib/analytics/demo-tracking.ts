'use client';

import { createClient } from '@/lib/supabase/client'

export async function trackDemoUsage(event: string, data?: any) {
    // Send to Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', event, {
            event_category: 'demo',
            ...data
        });
    }

    // Save to database (optional, good for internal tracking)
    // We'll just log it for now as the table demo_analytics might not exist yet in schema
    console.log('[DEMO ANALYTICS]', event, data);

    /* 
    // Uncomment when table exists
    const supabase = createClient()
    await supabase.from('demo_analytics').insert({
      event_name: event,
      event_data: data,
      timestamp: new Date().toISOString()
    });
    */
}
