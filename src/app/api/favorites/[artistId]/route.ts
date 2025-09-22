import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// DELETE /api/favorites/[artistId] - Remove artist from favorites
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ artistId: string }> }
) {
  try {
    const { artistId } = await params

    if (!artistId) {
      return NextResponse.json(
        { error: 'Artist ID is required' },
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

    // Remove from favorites
    const { error } = await supabase
      .from('favorite_artists')
      .delete()
      .eq('user_id', user.id)
      .eq('artist_id', artistId)

    if (error) {
      console.error('Remove favorite error:', error)
      return NextResponse.json(
        { error: 'Failed to remove favorite' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Artist removed from favorites',
    })

  } catch (error) {
    console.error('Remove favorite API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/favorites/[artistId] - Check if artist is favorited
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ artistId: string }> }
) {
  try {
    const { artistId } = await params

    if (!artistId) {
      return NextResponse.json(
        { error: 'Artist ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        success: true,
        isFavorited: false,
      })
    }

    // Check if artist is in favorites
    const { data, error } = await supabase
      .from('favorite_artists')
      .select('id')
      .eq('user_id', user.id)
      .eq('artist_id', artistId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Check favorite error:', error)
      return NextResponse.json(
        { error: 'Failed to check favorite status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      isFavorited: !!data,
    })

  } catch (error) {
    console.error('Check favorite API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}