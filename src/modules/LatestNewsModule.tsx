'use client';

import { useState, useEffect } from 'react';
import { Artist } from "@/types/artist";
import ArtistModule from '@/components/artist/ArtistModule';
import { newsCache } from '@/lib/cache/client-cache';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  image: string;
  date: string;
  formattedDate: string;
  source: string;
  author: string | null;
}

export default function LatestNewsModule({ artist }: { artist: Artist | null }) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    if (!artist) return;

    const fetchNews = async () => {
      const cacheKey = `news:${artist.id.toLowerCase()}`;
      
      // Check cache first
      const cachedNews = newsCache.get<NewsArticle[]>(cacheKey);
      if (cachedNews) {
        console.log(`Cache hit for news: ${artist.id}`);
        setNews(cachedNews);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        setFallbackMode(false);

        console.log(`Fetching news from API: ${artist.id}`);
        const response = await fetch(`/api/artists/${encodeURIComponent(artist.id)}/news`);
        const result = await response.json();

        if (!response.ok) {
          if (result.fallback) {
            // NewsAPI not configured, use fallback data
            setFallbackMode(true);
            // Convert NewsItem[] to NewsArticle[] format
            const fallbackNews = (artist.recentNews || []).map((item, index) => ({
              id: `fallback-${index}`,
              title: item.title,
              summary: item.summary,
              content: item.summary,
              url: '#',
              image: '',
              date: item.date,
              formattedDate: new Date(item.date).toLocaleDateString(),
              source: 'Sample Data',
              author: null
            }));
            setNews(fallbackNews);
          } else {
            setError(result.error || 'Failed to load news');
          }
          return;
        }

        const newsData = result.data || [];
        setNews(newsData);
        
        // Cache successful results
        newsCache.set(cacheKey, newsData);
      } catch (err) {
        console.error('Error fetching artist news:', err);
        setError('Failed to load latest news');
        // Fallback to placeholder data if available
        const fallbackNews = (artist.recentNews || []).map((item, index) => ({
          id: `fallback-${index}`,
          title: item.title,
          summary: item.summary,
          content: item.summary,
          url: '#',
          image: '',
          date: item.date,
          formattedDate: new Date(item.date).toLocaleDateString(),
          source: 'Sample Data',
          author: null
        }));
        setNews(fallbackNews);
        setFallbackMode(true);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [artist]);

  if (!artist) return null;

  return (
    <ArtistModule title="Latest News">
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="border-l-4 border-gray-200 pl-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-2 w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error && !fallbackMode ? (
        <div className="text-center py-6">
          <div className="text-gray-500 mb-2">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p className="font-medium">Unable to load news</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p className="font-medium">No recent news</p>
            <p className="text-sm">No news found for {artist.name}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {news.slice(0, 3).map((article, index) => (
            <article key={article.id || index} className="border-l-4 border-pink-400 pl-4">
              <a 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block hover:bg-gray-50 -ml-4 pl-4 py-2 rounded-r transition-colors duration-200"
              >
                <h3 className="font-medium text-gray-900 mb-1 hover:text-pink-600 transition-colors">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {article.summary}
                </p>
                <div className="flex items-center justify-between">
                  <time className="text-xs text-gray-500">
                    {article.formattedDate || new Date(article.date).toLocaleDateString()}
                  </time>
                  {article.source && (
                    <span className="text-xs text-gray-400">
                      {article.source}
                    </span>
                  )}
                </div>
              </a>
            </article>
          ))}
          
          {fallbackMode && (
            <div className="text-center pt-2">
              <span className="text-xs text-gray-400">Using sample data</span>
            </div>
          )}
        </div>
      )}
    </ArtistModule>
  );
}