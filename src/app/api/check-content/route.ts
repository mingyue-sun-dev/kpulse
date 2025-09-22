import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's followed artists
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('artist_id, artist_name')
      .eq('user_id', user.id);

    if (followsError) {
      console.error('Error fetching follows:', followsError);
      return NextResponse.json({ error: 'Failed to fetch followed artists' }, { status: 500 });
    }

    if (!follows || follows.length === 0) {
      return NextResponse.json({ 
        message: 'No followed artists to check',
        followedArtists: 0,
        newNotifications: 0
      });
    }

    console.log(`Checking ${follows.length} followed artists for ${user.email}`);

    // Simple simulation of content checking
    // In a real implementation, you would:
    // 1. Check Last.fm API for new songs/albums
    // 2. Check YouTube API for new videos  
    // 3. Check news APIs for artist news
    // 4. Compare with stored snapshots
    // 5. Create notifications for genuinely new content

    let newNotifications = 0;
    const notifications = [];

    // Simulate finding new content for some artists (for demo purposes)
    for (const artist of follows.slice(0, Math.min(3, follows.length))) {
      const hasNewContent = Math.random() < 0.2; // 20% chance of new content
      
      if (hasNewContent) {
        const contentTypes = ['new_song', 'new_album', 'new_video'] as const;
        const randomType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
        
        const notification = {
          user_id: user.id,
          artist_id: artist.artist_id,
          artist_name: artist.artist_name,
          type: randomType,
          title: `New ${randomType.replace('new_', '')} from ${artist.artist_name}!`,
          description: `${artist.artist_name} just released something new. Check it out!`,
          content_url: `https://example.com/artist/${artist.artist_id}`,
          is_seen: false
        };

        notifications.push(notification);
      }
    }

    // Insert notifications if any were found
    if (notifications.length > 0) {
      const { data: createdNotifications, error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (notificationError) {
        console.error('Error creating notifications:', notificationError);
        return NextResponse.json({ error: 'Failed to create notifications' }, { status: 500 });
      }

      newNotifications = createdNotifications?.length || 0;
      console.log(`Created ${newNotifications} new notifications`);
    }

    return NextResponse.json({
      message: 'Content check completed',
      followedArtists: follows.length,
      newNotifications,
      checkedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Content check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}