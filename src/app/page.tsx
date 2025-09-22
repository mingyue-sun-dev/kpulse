'use client';

import Header from '@/components/ui/Header';
import Footer from '@/components/ui/Footer';
import Card from '@/components/ui/Card';
import { useEffect, useState, lazy, Suspense } from 'react';

const ArtistCarousel = lazy(() => import('@/components/artist/ArtistCarousel'));
import { artistCache, newsCache } from '@/lib/cache/client-cache';

interface TrendingArtistData {
  id: string;
  name: string;
  followers: string;
  popularity?: number; // Spotify popularity score (0-100)
  loading: boolean;
}

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

export default function Home() {
  const [trendingArtists, setTrendingArtists] = useState<TrendingArtistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // News state
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);


  useEffect(() => {
    // Fetch real trending K-pop artists from Last.fm with caching
    const fetchTrendingArtists = async () => {
      const cacheKey = 'trending:artists:10';
      
      // Check cache first
      const cachedTrending = artistCache.get<TrendingArtistData[]>(cacheKey);
      if (cachedTrending) {
        console.log('Cache hit for trending artists');
        setTrendingArtists(cachedTrending);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching trending artists from API');
        const response = await fetch('/api/artists/trending?limit=10');
        if (response.ok) {
          const result = await response.json();
          const trendingData = result.data || [];
          setTrendingArtists(trendingData);
          
          // Cache successful results with shorter TTL for trending data
          artistCache.set(cacheKey, trendingData, 5 * 60 * 1000); // 5 minutes cache
        } else {
          const errorResult = await response.json();
          console.error('Failed to fetch trending artists:', errorResult.error);
          setError('Failed to load trending artists');
          
          // Fallback to some popular K-pop artists if API fails
          const fallbackArtists = [
            { id: 'bts', name: 'BTS', followers: '...', loading: false },
            { id: 'blackpink', name: 'BLACKPINK', followers: '...', loading: false },
            { id: 'newjeans', name: 'NewJeans', followers: '...', loading: false },
            { id: 'stray-kids', name: 'Stray Kids', followers: '...', loading: false },
            { id: 'twice', name: 'TWICE', followers: '...', loading: false },
            { id: 'aespa', name: 'aespa', followers: '...', loading: false },
            { id: 'itzy', name: 'ITZY', followers: '...', loading: false },
            { id: 'le-sserafim', name: 'LE SSERAFIM', followers: '...', loading: false },
            { id: 'ive', name: 'IVE', followers: '...', loading: false },
            { id: 'seventeen', name: 'SEVENTEEN', followers: '...', loading: false }
          ];
          setTrendingArtists(fallbackArtists);
        }
      } catch (err) {
        console.error('Error fetching trending artists:', err);
        setError('Failed to load trending artists');
        
        // Fallback to some popular K-pop artists
        const fallbackArtists = [
          { id: 'bts', name: 'BTS', followers: '...', loading: false },
          { id: 'blackpink', name: 'BLACKPINK', followers: '...', loading: false },
          { id: 'newjeans', name: 'NewJeans', followers: '...', loading: false },
          { id: 'stray-kids', name: 'Stray Kids', followers: '...', loading: false },
          { id: 'twice', name: 'TWICE', followers: '...', loading: false },
          { id: 'aespa', name: 'aespa', followers: '...', loading: false },
          { id: 'itzy', name: 'ITZY', followers: '...', loading: false },
          { id: 'le-sserafim', name: 'LE SSERAFIM', followers: '...', loading: false },
          { id: 'ive', name: 'IVE', followers: '...', loading: false },
          { id: 'seventeen', name: 'SEVENTEEN', followers: '...', loading: false }
        ];
        setTrendingArtists(fallbackArtists);
      } finally {
        setLoading(false);
      }
    };

    // Fetch latest K-pop news with caching
    const fetchKpopNews = async () => {
      const cacheKey = 'news:kpop:homepage:3';
      
      // Check cache first
      const cachedNews = newsCache.get<NewsArticle[]>(cacheKey);
      if (cachedNews) {
        console.log('Cache hit for K-pop news');
        setNews(cachedNews);
        setNewsLoading(false);
        return;
      }
      
      try {
        setNewsLoading(true);
        setNewsError(null);
        
        console.log('Fetching K-pop news from API');
        const response = await fetch('/api/news/kpop?limit=3');
        if (response.ok) {
          const result = await response.json();
          const newsData = result.data || [];
          setNews(newsData);
          
          // Cache successful results
          newsCache.set(cacheKey, newsData);
        } else {
          const errorResult = await response.json();
          console.error('Failed to fetch K-pop news:', errorResult.error);
          
          // If NewsAPI not configured, use fallback placeholder data
          if (errorResult.fallback) {
            setNewsError('NewsAPI not configured - using sample data');
            // You could add fallback news data here if needed
            setNews([]);
          } else {
            setNewsError('Failed to load latest news');
            setNews([]);
          }
        }
      } catch (err) {
        console.error('Error fetching K-pop news:', err);
        setNewsError('Failed to load latest news');
        setNews([]);
      } finally {
        setNewsLoading(false);
      }
    };

    fetchTrendingArtists();
    fetchKpopNews();
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Track Your Favorite
              <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent"> K-Pop Artists</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Discover insights, statistics, and the latest news from the world of Korean pop music
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-600 mb-2">1,000+</div>
                <div className="text-gray-600">Artists Tracked</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">50K+</div>
                <div className="text-gray-600">Songs Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">10M+</div>
                <div className="text-gray-600">Global Fans</div>
              </div>
            </div>
          </div>
        </section>

        {/* Trending Artists Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Trending K-Pop Artists</h2>
          <Suspense fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, index) => (
                <Card key={index} className="text-center animate-pulse h-full">
                  <div className="w-full h-32 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4 mx-auto"></div>
                </Card>
              ))}
            </div>
          }>
            <ArtistCarousel 
              artists={trendingArtists}
              loading={loading}
              error={error}
            />
          </Suspense>
        </section>

        {/* Latest News Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Latest K-Pop News</h2>
          {newsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </Card>
              ))}
            </div>
          ) : newsError ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-4">{newsError}</div>
              <div className="text-gray-500">Unable to load latest K-pop news</div>
            </div>
          ) : news.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">No K-pop news available at the moment</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {news.slice(0, 3).map((article) => (
                <a 
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-300">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/400x200/E6B3FF/000000?text=K-Pop+News';
                      }}
                    />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-gray-600 mb-3 text-sm line-clamp-3">
                      {article.summary}
                    </p>
                    <div className="flex items-center justify-between">
                      <time className="text-xs text-gray-500">
                        {article.formattedDate || new Date(article.date).toLocaleDateString()}
                      </time>
                      {article.source && (
                        <span className="text-xs text-purple-600 font-medium">
                          {article.source}
                        </span>
                      )}
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
