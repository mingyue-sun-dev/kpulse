import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get('artistId');
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (artistId) {
      // Get follow status for specific artist
      const { data: follow, error } = await supabase
        .from('follows')
        .select('*')
        .eq('user_id', user.id)
        .eq('artist_id', artistId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching follow status:', error);
        return NextResponse.json({ error: 'Failed to fetch follow status' }, { status: 500 });
      }

      return NextResponse.json({ 
        data: { 
          isFollowing: !!follow,
          follow: follow || null
        }
      });
    } else {
      // Get all follows for user
      const { data: follows, error } = await supabase
        .from('follows')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching follows:', error);
        return NextResponse.json({ error: 'Failed to fetch follows' }, { status: 500 });
      }

      return NextResponse.json({ data: follows });
    }
  } catch (error) {
    console.error('Follows API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { artistId, artistName } = await request.json();

    if (!artistId || !artistName) {
      return NextResponse.json({ error: 'Artist ID and name are required' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Insert follow
    const { data: follow, error } = await supabase
      .from('follows')
      .insert({
        user_id: user.id,
        artist_id: artistId,
        artist_name: artistName
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already following this artist' }, { status: 409 });
      }
      console.error('Error creating follow:', error);
      return NextResponse.json({ error: 'Failed to follow artist' }, { status: 500 });
    }

    return NextResponse.json({ data: follow }, { status: 201 });
  } catch (error) {
    console.error('Follow creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get('artistId');

    if (!artistId) {
      return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Delete follow
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('user_id', user.id)
      .eq('artist_id', artistId);

    if (error) {
      console.error('Error deleting follow:', error);
      return NextResponse.json({ error: 'Failed to unfollow artist' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Follow deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}