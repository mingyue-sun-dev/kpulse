import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Mark all notifications as seen for this user
    const { data: notifications, error } = await supabase
      .from('notifications')
      .update({ is_seen: true })
      .eq('user_id', user.id)
      .eq('is_seen', false)
      .select();

    if (error) {
      console.error('Error marking notifications as seen:', error);
      return NextResponse.json({ error: 'Failed to mark notifications as seen' }, { status: 500 });
    }

    return NextResponse.json({ 
      data: notifications,
      updatedCount: notifications?.length || 0
    });
  } catch (error) {
    console.error('Mark all seen error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}