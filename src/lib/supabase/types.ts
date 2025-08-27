export interface UserProfile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface FavoriteArtist {
  id: number
  user_id: string
  artist_id: string
  artist_name: string
  artist_image_url: string | null
  created_at: string
}

export interface UserFavoritesSummary {
  user_id: string
  total_favorites: number
  favorite_artists: string[]
  last_favorited: string
}

export interface Follow {
  id: string
  user_id: string
  artist_id: string
  artist_name: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  artist_id: string
  artist_name: string
  type: 'new_song' | 'new_album' | 'new_video' | 'news'
  title: string
  description: string | null
  content_url: string | null
  content_id: string | null
  image_url: string | null
  is_seen: boolean
  created_at: string
  updated_at: string
}

export interface ArtistContentSnapshot {
  id: string
  artist_id: string
  content_type: 'songs' | 'albums' | 'videos'
  content_hash: string
  last_content_ids: string[]
  last_checked_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>
      }
      favorite_artists: {
        Row: FavoriteArtist
        Insert: Omit<FavoriteArtist, 'id' | 'created_at'>
        Update: Partial<Omit<FavoriteArtist, 'id' | 'user_id' | 'created_at'>>
      }
      follows: {
        Row: Follow
        Insert: Omit<Follow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Follow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Notification, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      }
      artist_content_snapshots: {
        Row: ArtistContentSnapshot
        Insert: Omit<ArtistContentSnapshot, 'id' | 'updated_at'>
        Update: Partial<Omit<ArtistContentSnapshot, 'id' | 'artist_id' | 'content_type'>>
      }
    }
    Views: {
      user_favorites_summary: {
        Row: UserFavoritesSummary
      }
    }
  }
}