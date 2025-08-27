import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const unseenOnly = searchParams.get('unseenOnly') === 'true';
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Build query
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id);

    if (unseenOnly) {
      query = query.eq('is_seen', false);
    }

    const { data: notifications, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get unseen count
    const { count: unseenCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_seen', false);

    if (countError) {
      console.error('Error fetching unseen count:', countError);
    }

    return NextResponse.json({ 
      data: notifications,
      unseenCount: unseenCount || 0
    });
  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      artistId,
      artistName,
      type,
      title,
      description,
      contentUrl,
      contentId,
      imageUrl
    } = await request.json();

    if (!artistId || !artistName || !type || !title) {
      return NextResponse.json({ 
        error: 'Missing required fields: artistId, artistName, type, title' 
      }, { status: 400 });
    }

    // Validate type
    const validTypes = ['new_song', 'new_album', 'new_video', 'news'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid notification type' 
      }, { status: 400 });
    }

    // Get users following this artist
    const { data: followers, error: followersError } = await supabase
      .from('follows')
      .select('user_id')
      .eq('artist_id', artistId);

    if (followersError) {
      console.error('Error fetching followers:', followersError);
      return NextResponse.json({ error: 'Failed to fetch followers' }, { status: 500 });
    }

    if (!followers || followers.length === 0) {
      return NextResponse.json({ 
        message: 'No followers to notify',
        notificationsSent: 0
      });
    }

    // Create notifications for all followers
    const notifications = followers.map(follow => ({
      user_id: follow.user_id,
      artist_id: artistId,
      artist_name: artistName,
      type,
      title,
      description: description || null,
      content_url: contentUrl || null,
      content_id: contentId || null,
      image_url: imageUrl || null,
      is_seen: false
    }));

    const { data: createdNotifications, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('Error creating notifications:', error);
      return NextResponse.json({ error: 'Failed to create notifications' }, { status: 500 });
    }

    return NextResponse.json({ 
      data: createdNotifications,
      notificationsSent: createdNotifications?.length || 0
    }, { status: 201 });
  } catch (error) {
    console.error('Notification creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}