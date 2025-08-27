import { NextRequest, NextResponse } from 'next/server';
import { newsService } from '@/lib/api/news';
import { apiCache } from '@/lib/cache/simple-cache';
import { rateLimiter } from '@/lib/rateLimiter';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20); // Max 20 articles
  
  // Check rate limit before proceeding  
  const rateCheck = rateLimiter.checkLimit('artist-news'); // Reuse existing news rate limit
  if (!rateCheck.allowed) {
    console.warn(`Rate limit exceeded for kpop-news: ${rateCheck.message}`);
    return NextResponse.json({ 
      error: rateCheck.message || 'Rate limit exceeded',
      rateLimitInfo: {
        remaining: rateCheck.remaining,
        resetIn: rateCheck.resetIn
      }
    }, { status: 429 });
  }

  try {
    // Check cache first (4-hour cache for general news since it changes less frequently)
    const cacheKey = `kpop-news:latest:${limit}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for K-pop news (limit: ${limit})`);
      return NextResponse.json({ data: cachedData, cached: true });
    }
    
    console.log(`Cache miss for K-pop news (limit: ${limit}), fetching from NewsAPI`);
    
    const newsResult = await newsService.getLatestKpopNews(limit);

    if (!newsResult.success) {
      // Check if it's an API key issue
      if (newsResult.error?.code === 'MISSING_API_KEY') {
        return NextResponse.json({ 
          error: newsResult.error.message,
          fallback: true
        }, { status: 503 });
      }

      return NextResponse.json({ 
        error: newsResult.error?.message || 'Failed to fetch K-pop news' 
      }, { status: 500 });
    }

    // Transform news articles to our format
    const transformedNews = newsResult.data.map(article => ({
      id: `kpop-news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: article.title,
      summary: newsService.cleanContent(article.description),
      content: newsService.cleanContent(article.content),
      url: article.url,
      image: newsService.getArticleImage(article),
      date: article.publishedAt,
      formattedDate: newsService.formatArticleDate(article.publishedAt),
      source: article.source.name,
      author: article.author
    }));

    // Cache the result for 4 hours (general news changes less frequently than artist-specific news)
    apiCache.set(cacheKey, transformedNews, 14400);

    return NextResponse.json({ 
      data: transformedNews,
      source: 'newsapi',
      cached: false
    });
  } catch (error) {
    console.error('K-pop news API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}