'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/ui/Header'
import Footer from '@/components/ui/Footer'
import Card from '@/components/ui/Card'
import ArtistImage from '@/components/artist/ArtistImage'
import FavoriteButton from '@/components/artist/FavoriteButton'
import FollowButton from '@/components/artist/FollowButton'
import type { User } from '@supabase/supabase-js'

interface FavoriteArtist {
  id: number
  artist_id: string
  artist_name: string
  artist_image_url: string | null
  created_at: string
}

interface UserProfile {
  display_name: string
  email: string
  avatar_url: string | null
  created_at: string
}

interface FollowedArtist {
  id: string
  artist_id: string
  artist_name: string
  created_at: string
}

interface DashboardData {
  user: UserProfile
  favorites: FavoriteArtist[]
  follows: FollowedArtist[]
  stats: {
    totalFavorites: number
    totalFollows: number
    joinedDate: string
    lastActivity: string | null
  }
}

interface AnimatingFavorite extends FavoriteArtist {
  isRemoving?: boolean
}

interface AnimatingFollow extends FollowedArtist {
  isRemoving?: boolean
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [animatingFavorites, setAnimatingFavorites] = useState<AnimatingFavorite[]>([])
  const [animatingFollows, setAnimatingFollows] = useState<AnimatingFollow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login?redirectTo=/dashboard')
        return
      }

      setUser(user)
      await fetchDashboardData()
    }

    checkUser()
  }, [supabase.auth, router])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/dashboard')
      
      if (response.ok) {
        const result = await response.json()
        setDashboardData(result.data)
        setAnimatingFavorites(result.data.favorites.map((fav: FavoriteArtist) => ({ ...fav, isRemoving: false })))
        setAnimatingFollows(result.data.follows.map((follow: FollowedArtist) => ({ ...follow, isRemoving: false })))
      } else {
        const errorResult = await response.json()
        setError(errorResult.error || 'Failed to load dashboard data')
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleFavoriteToggle = (artistId: string, isFavorited: boolean) => {
    if (!isFavorited) {
      // Start removal animation
      setAnimatingFavorites(prev => 
        prev.map(fav => 
          fav.artist_id === artistId 
            ? { ...fav, isRemoving: true }
            : fav
        )
      )

      // Update dashboard data stats immediately
      if (dashboardData) {
        setDashboardData({
          ...dashboardData,
          stats: {
            ...dashboardData.stats,
            totalFavorites: Math.max(0, dashboardData.stats.totalFavorites - 1),
          }
        })
      }

      // Remove from both arrays after animation completes
      setTimeout(() => {
        setAnimatingFavorites(prev => 
          prev.filter(fav => fav.artist_id !== artistId)
        )
        
        if (dashboardData) {
          setDashboardData(prev => prev ? {
            ...prev,
            favorites: prev.favorites.filter(fav => fav.artist_id !== artistId)
          } : null)
        }
      }, 500) // Match the CSS animation duration
    } else {
      // Handle addition (though less likely from dashboard)
      fetchDashboardData()
    }
  }

  const handleFollowToggle = (artistId: string, isFollowing: boolean) => {
    if (!isFollowing) {
      // Start removal animation
      setAnimatingFollows(prev => 
        prev.map(follow => 
          follow.artist_id === artistId 
            ? { ...follow, isRemoving: true }
            : follow
        )
      )

      // Update dashboard data stats immediately
      if (dashboardData) {
        setDashboardData({
          ...dashboardData,
          stats: {
            ...dashboardData.stats,
            totalFollows: Math.max(0, dashboardData.stats.totalFollows - 1),
          }
        })
      }

      // Remove from both arrays after animation completes
      setTimeout(() => {
        setAnimatingFollows(prev => 
          prev.filter(follow => follow.artist_id !== artistId)
        )
        
        if (dashboardData) {
          setDashboardData(prev => prev ? {
            ...prev,
            follows: prev.follows.filter(follow => follow.artist_id !== artistId)
          } : null)
        }
      }, 500) // Match the CSS animation duration
    } else {
      // Handle addition (though less likely from dashboard)
      fetchDashboardData()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Dashboard</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchDashboardData()}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!dashboardData) {
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {dashboardData.user.display_name?.charAt(0).toUpperCase() || 
               dashboardData.user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {dashboardData.user.display_name || 'K-pop Fan'}!
              </h1>
              <p className="text-gray-600 mb-4">
                Manage your favorite K-pop artists and discover new music
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span>📅 Joined {formatDate(dashboardData.stats.joinedDate)}</span>
                <span>❤️ {dashboardData.stats.totalFavorites} favorites</span>
                <span>🔔 {dashboardData.stats.totalFollows} following</span>
                {dashboardData.stats.lastActivity && (
                  <span>🕒 Last activity {formatDate(dashboardData.stats.lastActivity)}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Favorites Section */}
        <div id="favorites" className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Favorite Artists</h2>
            <Link
              href="/"
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              Discover More Artists →
            </Link>
          </div>

          {animatingFavorites.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">🎵</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No favorites yet!</h3>
              <p className="text-gray-600 mb-6">
                Start building your collection by hearting artists you love
              </p>
              <Link
                href="/"
                className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
              >
                Explore K-pop Artists
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {animatingFavorites.map((favorite) => (
                <div 
                  key={favorite.id} 
                  className={`relative transition-all duration-500 ease-in-out ${
                    favorite.isRemoving 
                      ? 'opacity-0 scale-95 transform translate-y-2' 
                      : 'opacity-100 scale-100 transform translate-y-0'
                  }`}
                >
                  <Link href={`/artist/${favorite.artist_id}`}>
                    <Card className={`text-center cursor-pointer transition-all duration-300 ${
                      favorite.isRemoving 
                        ? 'hover:shadow-lg' 
                        : 'hover:shadow-xl'
                    }`}>
                      <div className="mx-auto mb-4">
                        <ArtistImage 
                          artistId={favorite.artist_id}
                          artistName={favorite.artist_name}
                          size="lg"
                        />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {favorite.artist_name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">
                        Added {formatDate(favorite.created_at)}
                      </p>
                      <div className={`inline-block bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium transition-opacity duration-300 ${
                        favorite.isRemoving ? 'opacity-50' : 'opacity-100'
                      }`}>
                        ❤️ {favorite.isRemoving ? 'Removing...' : 'Favorited'}
                      </div>
                    </Card>
                  </Link>
                  <div className="absolute top-3 right-3 z-10">
                    <FavoriteButton
                      artistId={favorite.artist_id}
                      artistName={favorite.artist_name}
                      artistImageUrl={favorite.artist_image_url}
                      onToggle={handleFavoriteToggle}
                      className={`bg-white bg-opacity-80 rounded-full p-1 shadow-sm hover:bg-opacity-100 transition-all ${
                        favorite.isRemoving ? 'pointer-events-none opacity-50' : ''
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Following Artists Section */}
        <div id="following" className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Artists You&apos;re Following</h2>
            <Link
              href="/"
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              Discover More Artists →
            </Link>
          </div>

          {animatingFollows.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">🔔</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Not following anyone yet!</h3>
              <p className="text-gray-600 mb-6">
                Follow artists to get notified when they release new content
              </p>
              <Link
                href="/"
                className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200"
              >
                Find Artists to Follow
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {animatingFollows.map((follow) => (
                <div 
                  key={follow.id} 
                  className={`relative transition-all duration-500 ease-in-out ${
                    follow.isRemoving 
                      ? 'opacity-0 scale-95 transform translate-y-2' 
                      : 'opacity-100 scale-100 transform translate-y-0'
                  }`}
                >
                  <Link href={`/artist/${follow.artist_id}`}>
                    <Card className={`text-center cursor-pointer transition-all duration-300 ${
                      follow.isRemoving 
                        ? 'hover:shadow-lg' 
                        : 'hover:shadow-xl'
                    }`}>
                      <div className="mx-auto mb-4">
                        <ArtistImage 
                          artistId={follow.artist_id}
                          artistName={follow.artist_name}
                          size="lg"
                        />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {follow.artist_name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">
                        Following since {formatDate(follow.created_at)}
                      </p>
                      <div className={`inline-block bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium transition-opacity duration-300 ${
                        follow.isRemoving ? 'opacity-50' : 'opacity-100'
                      }`}>
                        🔔 {follow.isRemoving ? 'Unfollowing...' : 'Following'}
                      </div>
                    </Card>
                  </Link>
                  <div className="absolute top-3 right-3 z-10">
                    <FollowButton
                      artistId={follow.artist_id}
                      artistName={follow.artist_name}
                      size="sm"
                      variant="outline"
                      className={`bg-white bg-opacity-80 shadow-sm hover:bg-opacity-100 transition-all ${
                        follow.isRemoving ? 'pointer-events-none opacity-50' : ''
                      }`}
                      onToggle={handleFollowToggle}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {dashboardData.favorites.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {dashboardData.stats.totalFavorites}
              </div>
              <div className="text-gray-600">Favorite Artists</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-pink-600 mb-2">
                {Math.floor((Date.now() - new Date(dashboardData.stats.joinedDate).getTime()) / (1000 * 60 * 60 * 24))}
              </div>
              <div className="text-gray-600">Days on KPulse</div>
            </Card>
            <Card className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {dashboardData.favorites.length > 0 ? 
                  Math.round(dashboardData.favorites.length / Math.max(1, Math.floor((Date.now() - new Date(dashboardData.stats.joinedDate).getTime()) / (1000 * 60 * 60 * 24 * 30)))) : 0}
              </div>
              <div className="text-gray-600">Favorites per Month</div>
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}