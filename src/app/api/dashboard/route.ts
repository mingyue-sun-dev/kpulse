import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/dashboard - Get user's dashboard data
export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Get user's favorite artists with additional data
    const { data: favorites, error: favoritesError } = await supabase
      .from('favorite_artists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (favoritesError) {
      console.error('Get favorites error:', favoritesError)
      return NextResponse.json(
        { error: 'Failed to fetch dashboard data' },
        { status: 500 }
      )
    }

    // Get user's followed artists
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (followsError) {
      console.error('Get follows error:', followsError)
      return NextResponse.json(
        { error: 'Failed to fetch dashboard data' },
        { status: 500 }
      )
    }

    // Get user favorites summary
    const { data: summary } = await supabase
      .from('user_favorites_summary')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // For each favorite artist, we could fetch additional real-time data
    // from Last.fm, but for performance, we'll just return the cached data
    const dashboardData = {
      user: {
        id: user.id,
        email: user.email,
        display_name: profile?.display_name || user.user_metadata?.display_name,
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
        created_at: profile?.created_at || user.created_at,
      },
      favorites: favorites || [],
      follows: follows || [],
      summary: summary || {
        total_favorites: 0,
        favorite_artists: [],
        last_favorited: null,
      },
      stats: {
        totalFavorites: favorites?.length || 0,
        totalFollows: follows?.length || 0,
        joinedDate: profile?.created_at || user.created_at,
        lastActivity: summary?.last_favorited,
      }
    }

    return NextResponse.json({
      success: true,
      data: dashboardData,
    })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}