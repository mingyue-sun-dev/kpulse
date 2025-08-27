import { NewsApiResult, NewsArticle, ApiResponse } from './types';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_BASE_URL = 'https://newsapi.org/v2';

class NewsService {
  private async fetchFromNewsApi<T>(endpoint: string, params: Record<string, string>): Promise<ApiResponse<T>> {
    if (!NEWS_API_KEY) {
      return {
        success: false,
        error: {
          message: 'NewsAPI key not configured. Please add NEWS_API_KEY to .env.local',
          code: 'MISSING_API_KEY'
        }
      };
    }

    const searchParams = new URLSearchParams({
      apiKey: NEWS_API_KEY,
      ...params
    });

    try {
      const response = await fetch(`${NEWS_BASE_URL}/${endpoint}?${searchParams.toString()}`);
      
      if (!response.ok) {
        return {
          success: false,
          error: {
            message: `NewsAPI error: ${response.statusText}`,
            status: response.status
          }
        };
      }

      const data = await response.json();

      // Check for NewsAPI specific errors
      if (data.status === 'error') {
        return {
          success: false,
          error: {
            message: data.message || 'Unknown NewsAPI error',
            code: data.code
          }
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR'
        }
      };
    }
  }

  async searchKpopNews(
    query?: string, 
    pageSize: number = 20,
    sortBy: 'relevancy' | 'popularity' | 'publishedAt' = 'publishedAt'
  ): Promise<ApiResponse<NewsArticle[]>> {
    const searchQuery = query 
      ? `"K-pop" AND ${query} AND NOT (politics OR sports OR weather OR business)` 
      : '("K-pop" OR "Korean pop") AND (BTS OR BLACKPINK OR "Stray Kids" OR NewJeans OR ITZY OR aespa OR TWICE OR "Red Velvet" OR SEVENTEEN OR ENHYPEN OR NMIXX OR IVE OR "Le Sserafim" OR MAMAMOO OR "(G)I-DLE") AND NOT (politics OR sports OR weather OR business OR financial OR stock)';
    
    const result = await this.fetchFromNewsApi<NewsApiResult>('everything', {
      q: searchQuery,
      language: 'en',
      sortBy,
      pageSize: (pageSize * 2).toString(), // Get more to filter for quality
      domains: 'allkpop.com,soompi.com,variety.com,billboard.com,rollingstone.com,pitchfork.com,ew.com,nme.com'
    });

    if (!result.success) {
      return result;
    }

    // Filter articles for K-pop relevance
    const filteredArticles = (result.data.articles || [])
      .filter(article => this.isGeneralKpopArticle(article))
      .slice(0, pageSize);

    return {
      success: true,
      data: filteredArticles
    };
  }

  async getArtistNews(artistName: string, pageSize: number = 3): Promise<ApiResponse<NewsArticle[]>> {
    // Create highly targeted K-pop specific search query
    const searchQuery = `"${artistName}" AND (K-pop OR "Korean pop" OR "Korean music" OR "K-pop group" OR "K-pop artist") AND NOT (general OR politics OR sports OR weather OR business OR financial OR stock OR market)`;
    
    const result = await this.fetchFromNewsApi<NewsApiResult>('everything', {
      q: searchQuery,
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: (pageSize * 5).toString(), // Get even more to filter aggressively for quality
      // Prioritize K-pop specific domains first, then general entertainment
      domains: 'allkpop.com,soompi.com,koreatimes.co.kr,koreaherald.com,variety.com,billboard.com,rollingstone.com,pitchfork.com,ew.com,nme.com'
    });

    if (!result.success) {
      return result;
    }

    // Filter articles for quality and relevance
    const filteredArticles = (result.data.articles || [])
      .filter(article => this.isQualityArticle(article, artistName))
      .slice(0, pageSize);

    return {
      success: true,
      data: filteredArticles
    };
  }

  // Helper method to determine if an article is high quality and K-pop relevant
  private isQualityArticle(article: NewsArticle, artistName: string): boolean {
    // Skip articles without proper title or description
    if (!article.title || !article.description) return false;
    
    const title = article.title.toLowerCase();
    const description = article.description.toLowerCase();
    const artistLower = artistName.toLowerCase();
    const content = (article.content || '').toLowerCase();
    const combinedText = `${title} ${description} ${content}`;
    
    // Must mention the artist in title or description
    const mentionsArtist = title.includes(artistLower) || description.includes(artistLower);
    if (!mentionsArtist) return false;
    
    // Strong K-pop indicators that increase relevance score
    const kpopIndicators = [
      'k-pop', 'kpop', 'korean pop', 'korean music', 'k-pop group', 'k-pop artist',
      'korean singer', 'korean band', 'korean entertainment', 'korean idol',
      'comeback', 'debut', 'music video', 'mv', 'choreography', 'fanclub',
      'album release', 'single release', 'chart', 'billboard', 'streaming',
      'concert tour', 'fanmeet', 'aegyo', 'visual', 'main vocalist', 'rapper',
      'leader', 'maknae', 'bias', 'stan', 'fandom'
    ];
    
    const kpopScore = kpopIndicators.reduce((score, indicator) => 
      combinedText.includes(indicator) ? score + 1 : score, 0);
    
    // Non-K-pop indicators that decrease relevance
    const irrelevantIndicators = [
      'stock market', 'financial', 'politics', 'election', 'government',
      'sports', 'football', 'basketball', 'weather', 'traffic', 'accident',
      'crime', 'murder', 'theft', 'lawsuit', 'legal', 'court case',
      'real estate', 'property', 'investment', 'cryptocurrency', 'bitcoin',
      'technology', 'software', 'hardware', 'science', 'research',
      'medical', 'health care', 'hospital', 'disease', 'pandemic'
    ];
    
    const irrelevantScore = irrelevantIndicators.reduce((score, indicator) => 
      combinedText.includes(indicator) ? score + 1 : score, 0);
    
    // Skip articles that are clearly not K-pop related
    if (kpopScore === 0 && irrelevantScore > 0) return false;
    
    // Skip low-quality content indicators
    const spamIndicators = [
      'click here', 'subscribe now', 'limited time', 'free download',
      'shocking', 'you won\'t believe', 'this one trick', 'doctors hate',
      'must see', 'viral', 'trending now', 'breaking news'
    ];
    
    const hasSpamIndicators = spamIndicators.some(spam => 
      combinedText.includes(spam)
    );
    
    if (hasSpamIndicators) return false;
    
    // Require substantial content
    const hasSubstantialContent = description.length > 100;
    
    // Higher standards: need either high K-pop relevance or be from a K-pop domain
    const isKpopDomain = article.source.name.toLowerCase().includes('kpop') || 
                        article.source.name.toLowerCase().includes('soompi') ||
                        article.source.name.toLowerCase().includes('allkpop');
    
    return hasSubstantialContent && (kpopScore >= 2 || isKpopDomain);
  }

  // Helper method to determine if an article is generally K-pop related (for homepage news)
  private isGeneralKpopArticle(article: NewsArticle): boolean {
    // Skip articles without proper title or description
    if (!article.title || !article.description) return false;
    
    const title = article.title.toLowerCase();
    const description = article.description.toLowerCase();
    const content = (article.content || '').toLowerCase();
    const combinedText = `${title} ${description} ${content}`;
    
    // Strong K-pop indicators
    const kpopIndicators = [
      'k-pop', 'kpop', 'korean pop', 'korean music', 'korean entertainment',
      'bts', 'blackpink', 'twice', 'stray kids', 'newjeans', 'itzy', 'aespa',
      'red velvet', 'seventeen', 'enhypen', 'nmixx', 'ive', 'le sserafim',
      'mamamoo', '(g)i-dle', 'gidle', 'korean idol', 'korean singer', 'korean band',
      'comeback', 'debut', 'music video', 'choreography', 'fanclub', 'fandom',
      'album release', 'single release', 'chart', 'streaming', 'concert tour',
      'fanmeet', 'korean wave', 'hallyu'
    ];
    
    const kpopScore = kpopIndicators.reduce((score, indicator) => 
      combinedText.includes(indicator) ? score + 1 : score, 0);
    
    // Non-K-pop indicators that decrease relevance
    const irrelevantIndicators = [
      'stock market', 'financial report', 'politics', 'election', 'government policy',
      'sports scores', 'football', 'basketball', 'weather forecast', 'traffic report',
      'crime report', 'murder', 'theft', 'lawsuit filed', 'court case',
      'real estate market', 'property sale', 'investment advice', 'cryptocurrency',
      'technology review', 'software update', 'hardware release', 'scientific study',
      'medical breakthrough', 'health care', 'hospital', 'disease outbreak'
    ];
    
    const irrelevantScore = irrelevantIndicators.reduce((score, indicator) => 
      combinedText.includes(indicator) ? score + 1 : score, 0);
    
    // Must have K-pop relevance and not be irrelevant
    const hasKpopRelevance = kpopScore >= 1;
    const isNotIrrelevant = irrelevantScore === 0;
    
    // Skip low-quality content indicators
    const spamIndicators = [
      'click here', 'subscribe now', 'limited time', 'free download',
      'shocking revelation', 'you won\'t believe', 'this one trick'
    ];
    
    const hasSpamIndicators = spamIndicators.some(spam => 
      combinedText.includes(spam)
    );
    
    // Require substantial content
    const hasSubstantialContent = description.length > 80;
    
    // Check if from a known K-pop domain
    const isKpopDomain = article.source.name.toLowerCase().includes('kpop') || 
                        article.source.name.toLowerCase().includes('soompi') ||
                        article.source.name.toLowerCase().includes('allkpop');
    
    return hasSubstantialContent && 
           !hasSpamIndicators && 
           (hasKpopRelevance || isKpopDomain) && 
           isNotIrrelevant;
  }

  async getLatestKpopNews(pageSize: number = 15): Promise<ApiResponse<NewsArticle[]>> {
    return this.searchKpopNews(undefined, pageSize, 'publishedAt');
  }

  async getTopKpopNews(pageSize: number = 10): Promise<ApiResponse<NewsArticle[]>> {
    return this.searchKpopNews(undefined, pageSize, 'popularity');
  }

  // Helper method to format date
  formatArticleDate(publishedAt: string): string {
    const date = new Date(publishedAt);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Helper method to clean article content
  cleanContent(content: string | null): string {
    if (!content) return 'No content available';
    
    // Remove common suffixes like "[+1234 chars]"
    return content.replace(/\[\+\d+\s+chars\]$/, '').trim();
  }

  // Helper method to get article image with fallback
  getArticleImage(article: NewsArticle): string {
    return article.urlToImage || 'https://via.placeholder.com/400x200/E6B3FF/000000?text=K-Pop+News';
  }
}

export const newsService = new NewsService();