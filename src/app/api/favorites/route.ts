import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/favorites - Get user's favorite artists
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

    // Get user's favorite artists
    const { data: favorites, error } = await supabase
      .from('favorite_artists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get favorites error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: favorites,
    })

  } catch (error) {
    console.error('Get favorites API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/favorites - Add artist to favorites
export async function POST(request: NextRequest) {
  try {
    const { artistId, artistName, artistImageUrl } = await request.json()

    if (!artistId || !artistName) {
      return NextResponse.json(
        { error: 'Artist ID and name are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Add to favorites (will ignore if already exists due to UNIQUE constraint)
    const { data, error } = await supabase
      .from('favorite_artists')
      .insert({
        user_id: user.id,
        artist_id: artistId,
        artist_name: artistName,
        artist_image_url: artistImageUrl,
      })
      .select()

    if (error) {
      // Check if it's a duplicate entry
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Artist is already in your favorites' },
          { status: 409 }
        )
      }
      
      console.error('Add favorite error:', error)
      return NextResponse.json(
        { error: 'Failed to add favorite' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Artist added to favorites',
      data: data[0],
    })

  } catch (error) {
    console.error('Add favorite API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}