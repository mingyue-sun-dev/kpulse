'use client';

import { useState, useEffect } from 'react';
import ArtistModule from '@/components/artist/ArtistModule';
import { videosCache } from '@/lib/cache/client-cache';
// Simple SVG icons as components
const PlayIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const ExternalLinkIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

interface MusicVideo {
  metadata: {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    channelTitle: string;
    publishedAt: string;
    viewCount?: number;
    duration?: string;
    score?: number;
    isOfficial?: boolean;
  };
  embedUrl: string;
  url: string;
  cachedAt: number;
}

interface MusicVideoModuleProps {
  artistId: string;
  artistName: string;
}

export default function MusicVideoModule({ artistId, artistName }: MusicVideoModuleProps) {
  const [videos, setVideos] = useState<MusicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [embedLoaded, setEmbedLoaded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchVideos = async () => {
      const cacheKey = `videos:${artistId.toLowerCase()}`;
      
      // Check cache first
      const cachedVideos = videosCache.get<MusicVideo[]>(cacheKey);
      if (cachedVideos) {
        console.log(`Cache hit for videos: ${artistId}`);
        setVideos(cachedVideos);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        setQuotaExhausted(false);

        console.log(`Fetching videos from API: ${artistId}`);
        const response = await fetch(`/api/artists/${encodeURIComponent(artistId)}/videos`);
        const result = await response.json();

        if (!response.ok) {
          if (result.quotaExhausted) {
            setQuotaExhausted(true);
            setError(result.error || 'YouTube API quota exhausted');
          } else {
            setError(result.error || 'Failed to load music video');
          }
          return;
        }

        const videoData = result.data || [];
        setVideos(videoData);
        
        // Cache successful results with longer TTL for videos since YouTube quota is limited
        videosCache.set(cacheKey, videoData, 60 * 60 * 1000); // 1 hour cache
      } catch (err) {
        console.error('Error fetching music videos:', err);
        setError('Failed to load music video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [artistId]);

  const loadEmbed = (videoId: string) => {
    setEmbedLoaded(prev => ({
      ...prev,
      [videoId]: true
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatViewCount = (viewCount?: number) => {
    if (!viewCount) return '';
    
    if (viewCount >= 1000000) {
      return `${(viewCount / 1000000).toFixed(1)}M views`;
    } else if (viewCount >= 1000) {
      return `${(viewCount / 1000).toFixed(1)}K views`;
    } else {
      return `${viewCount} views`;
    }
  };


  if (loading) {
    return (
      <ArtistModule title="Music Video">
        <div className="w-full max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="bg-gray-200 rounded-lg aspect-video mb-4 shadow-md"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="flex items-center gap-3">
                <div className="h-3 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </ArtistModule>
    );
  }

  if (error) {
    return (
      <ArtistModule title="Music Video">
        <div className="text-center py-8">
          {quotaExhausted ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-yellow-800">YouTube API Quota Exhausted</span>
              </div>
              <p className="text-yellow-700 text-sm">
                Daily YouTube API quota has been reached. Videos will be available tomorrow.
              </p>
            </div>
          ) : (
            <div className="text-gray-500">
              <PlayIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium mb-1">Unable to load music videos</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </ArtistModule>
    );
  }

  if (videos.length === 0) {
    return (
      <ArtistModule title="Music Video">
        <div className="text-center py-8">
          <PlayIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium mb-1">No music videos found</p>
          <p className="text-gray-400 text-sm">No videos found for {artistName}</p>
        </div>
      </ArtistModule>
    );
  }

  // Since we're only showing 1 video now, get the first video
  const video = videos[0];
  if (!video) {
    return (
      <ArtistModule title="Music Video">
        <div className="text-center py-8">
          <PlayIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium mb-1">No music video found</p>
          <p className="text-gray-400 text-sm">No video found for {artistName}</p>
        </div>
      </ArtistModule>
    );
  }

  return (
    <ArtistModule title="Music Video">
      <div className="w-full max-w-4xl mx-auto">
        {(() => {
          const videoId = video.metadata.id;
          const isEmbedLoaded = embedLoaded[videoId];
          
          return (
            <div className="group">
              {/* Video Player Area - Show thumbnail or embed */}
              <div className="relative aspect-video rounded-lg overflow-hidden mb-4 bg-gray-100 shadow-md">
                {!isEmbedLoaded ? (
                  // Thumbnail with play button overlay
                  <div className="relative w-full h-full cursor-pointer" onClick={() => loadEmbed(videoId)}>
                    <img
                      src={video.metadata.thumbnail}
                      alt={`${video.metadata.title} thumbnail`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-50 transition-all">
                      <div className="w-16 h-16 rounded-full bg-red-600 bg-opacity-90 flex items-center justify-center hover:bg-opacity-100 transition-all">
                        <PlayIcon className="w-6 h-6 text-white ml-1" />
                      </div>
                    </div>
                  </div>
                ) : (
                  // YouTube embed iframe
                  <iframe
                    src={video.embedUrl}
                    title={`${video.metadata.title} - ${artistName} Music Video`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className="w-full h-full"
                  />
                )}
              </div>
              
              {/* Video Info */}
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight flex-1">
                    {video.metadata.title}
                  </h3>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <ExternalLinkIcon className="w-4 h-4" />
                  </a>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    {video.metadata.channelTitle}
                    {video.metadata.isOfficial && (
                      <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        Official
                      </span>
                    )}
                  </span>
                  <span>•</span>
                  <span>{formatDate(video.metadata.publishedAt)}</span>
                  {video.metadata.viewCount && (
                    <>
                      <span>•</span>
                      <span className="text-green-600 font-medium">{formatViewCount(video.metadata.viewCount)}</span>
                    </>
                  )}
                  {video.metadata.duration && (
                    <>
                      <span>•</span>
                      <span>{video.metadata.duration}</span>
                    </>
                  )}
                </div>
                
                {video.metadata.description && (
                  <p className="text-xs text-gray-600 mt-2" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {video.metadata.description.length > 120 
                      ? video.metadata.description.substring(0, 120) + '...' 
                      : video.metadata.description
                    }
                  </p>
                )}
                
                {/* Quality indicator */}
                {video.metadata.score && (
                  <div className="text-xs text-blue-600 font-medium">
                    Quality Score: {(video.metadata.score * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </ArtistModule>
  );
}