'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FavoriteButtonProps {
  artistId: string
  artistName: string
  artistImageUrl?: string | null
  className?: string
  onToggle?: (artistId: string, isFavorited: boolean) => void
}

export default function FavoriteButton({
  artistId,
  artistName,
  artistImageUrl,
  className = '',
  onToggle
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        checkFavoriteStatus()
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          checkFavoriteStatus()
        } else {
          setIsFavorited(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [artistId])

  const checkFavoriteStatus = async () => {
    try {
      const response = await fetch(`/api/favorites/${artistId}`)
      if (response.ok) {
        const result = await response.json()
        setIsFavorited(result.isFavorited)
      }
    } catch (error) {
      console.error('Error checking favorite status:', error)
    }
  }

  const toggleFavorite = async (e?: React.MouseEvent) => {
    // Prevent event propagation to avoid triggering parent click handlers
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!user) {
      // Redirect to login or show login modal
      window.location.href = '/login'
      return
    }

    setLoading(true)

    try {
      if (isFavorited) {
        // Remove from favorites
        const response = await fetch(`/api/favorites/${artistId}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          setIsFavorited(false)
          onToggle?.(artistId, false)
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to remove favorite')
        }
      } else {
        // Add to favorites
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            artistId,
            artistName,
            artistImageUrl,
          }),
        })

        if (response.ok) {
          setIsFavorited(true)
          onToggle?.(artistId, true)
        } else {
          const error = await response.json()
          if (response.status === 409) {
            setIsFavorited(true) // Already favorited
            onToggle?.(artistId, true)
          } else {
            alert(error.error || 'Failed to add favorite')
          }
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`flex items-center space-x-1 transition-colors ${className} ${
        loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
      }`}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <span className={`text-2xl ${isFavorited ? 'text-red-500' : 'text-gray-400'}`}>
        {isFavorited ? '❤️' : '🤍'}
      </span>
      {loading && (
        <span className="text-xs text-gray-500">...</span>
      )}
    </button>
  )
}