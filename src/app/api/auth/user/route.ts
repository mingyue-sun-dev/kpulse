import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      // Return basic user info if profile doesn't exist yet
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url,
        }
      })
    }

    return NextResponse.json({
      user: {
        ...user,
        profile,
      },
    })

  } catch (error) {
    console.error('Get user API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}