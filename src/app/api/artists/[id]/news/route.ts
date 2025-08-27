import { NextRequest, NextResponse } from 'next/server';
import { newsService } from '@/lib/api/news';
import { apiCache } from '@/lib/cache/simple-cache';
import { rateLimiter } from '@/lib/rateLimiter';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  if (!id) {
    return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 });
  }

  // Check rate limit before proceeding
  const rateCheck = rateLimiter.checkLimit('artist-news');
  if (!rateCheck.allowed) {
    console.warn(`Rate limit exceeded for artist-news: ${rateCheck.message}`);
    return NextResponse.json({ 
      error: rateCheck.message || 'Rate limit exceeded',
      rateLimitInfo: {
        remaining: rateCheck.remaining,
        resetIn: rateCheck.resetIn
      }
    }, { status: 429 });
  }

  try {
    // Convert ID back to artist name
    const artistName = id.replace(/-/g, ' ');
    
    // Check cache first (longer cache for news due to API limits)
    const cacheKey = `artist-news:${artistName.toLowerCase()}`;
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for artist news: ${artistName}`);
      return NextResponse.json({ data: cachedData });
    }
    
    console.log(`Cache miss for artist news: ${artistName}, fetching from NewsAPI`);
    
    const newsResult = await newsService.getArtistNews(artistName, 3);

    if (!newsResult.success) {
      // Check if it's an API key issue
      if (newsResult.error?.code === 'MISSING_API_KEY') {
        return NextResponse.json({ 
          error: newsResult.error.message,
          fallback: true
        }, { status: 503 });
      }

      return NextResponse.json({ 
        error: newsResult.error?.message || 'Failed to fetch news' 
      }, { status: 500 });
    }

    // Transform news articles to our format
    const transformedNews = newsResult.data.map(article => ({
      id: `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

    // Cache the result for 2 hours (news changes frequently but API has limits)
    apiCache.set(cacheKey, transformedNews, 7200);

    return NextResponse.json({ 
      data: transformedNews,
      source: 'newsapi',
      cached: false
    });
  } catch (error) {
    console.error('Artist news API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}