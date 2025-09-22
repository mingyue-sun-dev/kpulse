import { 
  SpotifyArtist,
  SpotifySearchResponse,
  SpotifyTokenResponse,
  ApiResponse
} from './types';

// Spotify API credentials (to be provided by user)
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || 'YOUR_SPOTIFY_CLIENT_ID_HERE';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || 'YOUR_SPOTIFY_CLIENT_SECRET_HERE';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

class SpotifyService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  // Get Spotify access token using Client Credentials flow
  private async getAccessToken(): Promise<string | null> {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!SPOTIFY_CLIENT_ID || SPOTIFY_CLIENT_ID === 'YOUR_SPOTIFY_CLIENT_ID_HERE') {
      console.error('Spotify Client ID not configured');
      return null;
    }

    if (!SPOTIFY_CLIENT_SECRET || SPOTIFY_CLIENT_SECRET === 'YOUR_SPOTIFY_CLIENT_SECRET_HERE') {
      console.error('Spotify Client Secret not configured');
      return null;
    }

    try {
      const response = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
        },
        body: 'grant_type=client_credentials'
      });

      if (!response.ok) {
        console.error('Failed to get Spotify access token:', response.statusText);
        return null;
      }

      const tokenData: SpotifyTokenResponse = await response.json();
      
      // Cache the token
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000) - 60000; // Subtract 1 minute for safety
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting Spotify access token:', error);
      return null;
    }
  }

  // Search for artist and get their image
  async getArtistImage(artistName: string): Promise<ApiResponse<string | null>> {
    const token = await this.getAccessToken();
    
    if (!token) {
      return {
        success: false,
        error: {
          message: 'Failed to authenticate with Spotify API',
          code: 'AUTH_ERROR'
        }
      };
    }

    try {
      const searchParams = new URLSearchParams({
        q: artistName,
        type: 'artist',
        limit: '1' // We only need the first (most relevant) result
      });

      const response = await fetch(`${SPOTIFY_API_BASE}/search?${searchParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: `Spotify API error: ${response.statusText}`,
            status: response.status
          }
        };
      }

      const searchData: SpotifySearchResponse = await response.json();
      
      if (searchData.artists.items.length === 0) {
        return {
          success: true,
          data: null // No artist found
        };
      }

      const artist = searchData.artists.items[0];
      
      // Get the best image (largest available)
      const image = this.getBestImage(artist.images);
      
      return {
        success: true,
        data: image
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'NETWORK_ERROR'
        }
      };
    }
  }

  // Get full artist data including image, followers, etc.
  async getArtistData(artistName: string): Promise<ApiResponse<SpotifyArtist | null>> {
    const token = await this.getAccessToken();
    
    if (!token) {
      return {
        success: false,
        error: {
          message: 'Failed to authenticate with Spotify API',
          code: 'AUTH_ERROR'
        }
      };
    }

    try {
      const searchParams = new URLSearchParams({
        q: artistName,
        type: 'artist',
        limit: '1'
      });

      const response = await fetch(`${SPOTIFY_API_BASE}/search?${searchParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: `Spotify API error: ${response.statusText}`,
            status: response.status
          }
        };
      }

      const searchData: SpotifySearchResponse = await response.json();
      
      if (searchData.artists.items.length === 0) {
        return {
          success: true,
          data: null
        };
      }

      return {
        success: true,
        data: searchData.artists.items[0]
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'NETWORK_ERROR'
        }
      };
    }
  }

  // Helper method to get the best image from Spotify image array
  private getBestImage(images: any[]): string | null {
    if (!images || images.length === 0) {
      return null;
    }

    // Sort by dimensions (largest first) and return the URL of the largest image
    const sortedImages = images.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    return sortedImages[0]?.url || null;
  }

  // Search for a track and get its Spotify ID
  async searchTrack(artistName: string, trackName: string): Promise<ApiResponse<string | null>> {
    const token = await this.getAccessToken();
    
    if (!token) {
      return {
        success: false,
        error: {
          message: 'Failed to authenticate with Spotify API',
          code: 'AUTH_ERROR'
        }
      };
    }

    try {
      // Clean up the search query for better matching
      const cleanArtist = artistName.replace(/[^\w\s]/g, '').trim();
      const cleanTrack = trackName.replace(/[^\w\s]/g, '').trim();
      const query = `track:"${cleanTrack}" artist:"${cleanArtist}"`;

      const searchParams = new URLSearchParams({
        q: query,
        type: 'track',
        limit: '1'
      });

      const response = await fetch(`${SPOTIFY_API_BASE}/search?${searchParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: `Spotify API error: ${response.statusText}`,
            status: response.status
          }
        };
      }

      const searchData = await response.json();
      
      if (!searchData.tracks || searchData.tracks.items.length === 0) {
        return {
          success: true,
          data: null // No track found
        };
      }

      const track = searchData.tracks.items[0];
      return {
        success: true,
        data: track.id
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'NETWORK_ERROR'
        }
      };
    }
  }

  // Search for an album and get its Spotify ID
  async searchAlbum(artistName: string, albumName: string): Promise<ApiResponse<string | null>> {
    const token = await this.getAccessToken();
    
    if (!token) {
      return {
        success: false,
        error: {
          message: 'Failed to authenticate with Spotify API',
          code: 'AUTH_ERROR'
        }
      };
    }

    try {
      // Clean up the search query for better matching
      const cleanArtist = artistName.replace(/[^\w\s]/g, '').trim();
      const cleanAlbum = albumName.replace(/[^\w\s]/g, '').trim();
      const query = `album:"${cleanAlbum}" artist:"${cleanArtist}"`;

      const searchParams = new URLSearchParams({
        q: query,
        type: 'album',
        limit: '1'
      });

      const response = await fetch(`${SPOTIFY_API_BASE}/search?${searchParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: `Spotify API error: ${response.statusText}`,
            status: response.status
          }
        };
      }

      const searchData = await response.json();
      
      if (!searchData.albums || searchData.albums.items.length === 0) {
        return {
          success: true,
          data: null // No album found
        };
      }

      const album = searchData.albums.items[0];
      return {
        success: true,
        data: album.id
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'NETWORK_ERROR'
        }
      };
    }
  }

  // Get artist's latest album (most recent release)
  async getArtistLatestAlbum(artistName: string): Promise<ApiResponse<any | null>> {
    const token = await this.getAccessToken();
    
    if (!token) {
      return {
        success: false,
        error: {
          message: 'Failed to authenticate with Spotify API',
          code: 'AUTH_ERROR'
        }
      };
    }

    try {
      // First, search for the artist to get their Spotify ID
      const artistResult = await this.getArtistData(artistName);
      
      if (!artistResult.success || !artistResult.data) {
        return {
          success: true,
          data: null // Artist not found
        };
      }

      const artistSpotifyId = artistResult.data.id;

      // Get the artist's albums, sorted by release date (newest first)
      const response = await fetch(`${SPOTIFY_API_BASE}/artists/${artistSpotifyId}/albums?include_groups=album,single&market=US&limit=1&offset=0`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: `Spotify API error: ${response.statusText}`,
            status: response.status
          }
        };
      }

      const albumsData = await response.json();
      
      if (!albumsData.items || albumsData.items.length === 0) {
        return {
          success: true,
          data: null // No albums found
        };
      }

      const latestAlbum = albumsData.items[0];
      return {
        success: true,
        data: {
          id: latestAlbum.id,
          name: latestAlbum.name,
          release_date: latestAlbum.release_date,
          total_tracks: latestAlbum.total_tracks,
          images: latestAlbum.images,
          external_urls: latestAlbum.external_urls
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'NETWORK_ERROR'
        }
      };
    }
  }

  // Get artist's top tracks from Spotify
  async getArtistTopTracks(artistName: string, limit: number = 5): Promise<ApiResponse<any[] | null>> {
    const token = await this.getAccessToken();
    
    if (!token) {
      return {
        success: false,
        error: {
          message: 'Failed to authenticate with Spotify API',
          code: 'AUTH_ERROR'
        }
      };
    }

    try {
      // First, search for the artist to get their Spotify ID
      const artistResult = await this.getArtistData(artistName);
      
      if (!artistResult.success || !artistResult.data) {
        return {
          success: true,
          data: null // Artist not found
        };
      }

      const artistSpotifyId = artistResult.data.id;

      // Get the artist's top tracks
      const response = await fetch(`${SPOTIFY_API_BASE}/artists/${artistSpotifyId}/top-tracks?market=US`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: `Spotify API error: ${response.statusText}`,
            status: response.status
          }
        };
      }

      const tracksData = await response.json();
      
      if (!tracksData.tracks || tracksData.tracks.length === 0) {
        return {
          success: true,
          data: [] // No tracks found
        };
      }

      // Transform the data and limit results
      const topTracks = tracksData.tracks.slice(0, limit).map((track: any) => ({
        id: track.id,
        name: track.name,
        popularity: track.popularity,
        preview_url: track.preview_url,
        duration_ms: track.duration_ms,
        external_urls: track.external_urls
      }));

      return {
        success: true,
        data: topTracks
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'NETWORK_ERROR'
        }
      };
    }
  }

  // Get related artists from Spotify
  async getRelatedArtists(artistName: string, limit: number = 6): Promise<ApiResponse<any[] | null>> {
    const token = await this.getAccessToken();
    
    if (!token) {
      return {
        success: false,
        error: {
          message: 'Failed to authenticate with Spotify API',
          code: 'AUTH_ERROR'
        }
      };
    }

    try {
      // First, search for the artist to get their Spotify ID
      const artistResult = await this.getArtistData(artistName);
      
      if (!artistResult.success || !artistResult.data) {
        console.log(`Related artists: Artist '${artistName}' not found on Spotify`);
        return {
          success: true,
          data: [] // Artist not found, return empty array
        };
      }

      const artistSpotifyId = artistResult.data.id;
      console.log(`Related artists: Found artist '${artistName}' with Spotify ID: ${artistSpotifyId}`);

      // Get the artist's related artists
      const url = `${SPOTIFY_API_BASE}/artists/${artistSpotifyId}/related-artists`;
      console.log(`Related artists: Calling Spotify API: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Related artists: Spotify API error for artist '${artistName}' (ID: ${artistSpotifyId}): ${response.status} ${response.statusText}. Response: ${errorText}`);
        
        // If the artist doesn't have related artists or requires user auth, return empty array 
        if (response.status === 404 || response.status === 403) {
          console.log(`Related artists: Spotify related-artists endpoint requires user authentication (got ${response.status})`);
          return {
            success: true,
            data: [] // No related artists available for this artist (requires user auth)
          };
        }
        
        return {
          success: false,
          error: {
            message: `Spotify API error: ${response.statusText}`,
            status: response.status
          }
        };
      }

      const relatedData = await response.json();
      
      if (!relatedData.artists || relatedData.artists.length === 0) {
        return {
          success: true,
          data: [] // No related artists found
        };
      }

      // Transform the data and limit results
      const relatedArtists = relatedData.artists.slice(0, limit).map((artist: any) => ({
        id: artist.name.toLowerCase().replace(/\s+/g, '-'),
        name: artist.name,
        spotifyId: artist.id,
        image: this.getBestImage(artist.images),
        followers: artist.followers?.total || 0,
        popularity: artist.popularity || 0,
        genres: artist.genres || []
      }));

      return {
        success: true,
        data: relatedArtists
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'NETWORK_ERROR'
        }
      };
    }
  }

  // Search for multiple artists
  async searchArtists(query: string, limit: number = 10): Promise<ApiResponse<SpotifyArtist[]>> {
    const token = await this.getAccessToken();
    
    if (!token) {
      return {
        success: false,
        error: {
          message: 'Failed to authenticate with Spotify API',
          code: 'AUTH_ERROR'
        }
      };
    }

    try {
      const searchParams = new URLSearchParams({
        q: query,
        type: 'artist',
        limit: Math.min(limit, 50).toString() // Spotify max is 50
      });

      const response = await fetch(`${SPOTIFY_API_BASE}/search?${searchParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            message: `Spotify API error: ${response.statusText}`,
            status: response.status
          }
        };
      }

      const searchData: SpotifySearchResponse = await response.json();
      
      if (!searchData.artists || searchData.artists.items.length === 0) {
        return {
          success: true,
          data: [] // No artists found
        };
      }

      return {
        success: true,
        data: searchData.artists.items
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'NETWORK_ERROR'
        }
      };
    }
  }

  // Check if Spotify is properly configured
  isConfigured(): boolean {
    return SPOTIFY_CLIENT_ID !== 'YOUR_SPOTIFY_CLIENT_ID_HERE' && 
           SPOTIFY_CLIENT_SECRET !== 'YOUR_SPOTIFY_CLIENT_SECRET_HERE' &&
           !!SPOTIFY_CLIENT_ID && 
           !!SPOTIFY_CLIENT_SECRET;
  }
}

export const spotifyService = new SpotifyService();