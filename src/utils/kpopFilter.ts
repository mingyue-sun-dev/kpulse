/**
 * K-pop Artist Detection and Filtering Utilities
 * 
 * This module provides functions to identify and filter K-pop artists
 * based on various criteria including genres, artist names, and keywords.
 */

interface ArtistData {
  name: string;
  genres?: string[];
  popularity?: number;
}

// Known K-pop entertainment companies and labels
const KPOP_COMPANIES = [
  'sm entertainment', 'yg entertainment', 'jyp entertainment', 'hybe', 'hybe labels',
  'big hit entertainment', 'starship entertainment', 'cube entertainment', 
  'fnc entertainment', 'woolim entertainment', 'pledis entertainment',
  'source music', 'ador', 'koz entertainment', 'belift lab',
  'stone music entertainment', '1thek', 'mnet', 'kakao entertainment'
];

// K-pop specific genres and keywords
const KPOP_GENRES = [
  'k-pop', 'kpop', 'korean pop', 'k pop',
  'korean hip hop', 'korean r&b', 'korean indie',
  'korean rock', 'korean ballad', 'korean dance',
  'korean girl group', 'korean boy group'
];

// Common K-pop artist name patterns and keywords
const KPOP_NAME_PATTERNS = [
  // Individual artists with Korean-style names
  /\b(aespa|blackpink|twice|red velvet|girls generation|snsd|itzy|ive|newjeans|le sserafim)\b/i,
  /\b(bts|bangtan|exo|seventeen|stray kids|txt|tomorrow x together|enhypen|ateez|nct)\b/i,
  /\b(bigbang|winner|ikon|treasure|blackswan|everglow|gidle|fromis_9|loona)\b/i,
  /\b(mamamoo|hwasa|solar|moonbyul|wheein|taeyeon|iu|lee ji eun|chungha|sunmi)\b/i,
  /\b(jimin|jungkook|v|rm|suga|j-hope|jin|lisa|jennie|rose|jisoo)\b/i,
  /\b(nayeon|jihyo|momo|sana|mina|dahyun|chaeyoung|tzuyu|suzy|hyuna)\b/i,
  // Group name patterns
  /(girls|boys?)(\s|-|_)?(generation|group|band)/i,
  /\b\w+teen\b/i, // like seventeen
  /\b\w+z\b/i, // like itzy, ateez
  // Korean surnames as part of stage names
  /\b(kim|lee|park|choi|jung|kang|cho|yoon|jang|lim)\s+\w+/i,
];

// Korean language detection (basic Hangul range)
const KOREAN_PATTERN = /[\u3131-\u314e\u314f-\u3163\uac00-\ud7a3]/;

// High-popularity threshold for non-obvious cases
const HIGH_POPULARITY_THRESHOLD = 70;

/**
 * Checks if an artist name contains Korean characters
 */
function hasKoreanCharacters(name: string): boolean {
  return KOREAN_PATTERN.test(name);
}

/**
 * Checks if artist name matches known K-pop patterns
 */
function matchesKpopNamePatterns(name: string): boolean {
  return KPOP_NAME_PATTERNS.some(pattern => pattern.test(name));
}

/**
 * Checks if artist has K-pop related genres
 */
function hasKpopGenres(genres: string[]): boolean {
  if (!genres || genres.length === 0) return false;
  
  const genreString = genres.join(' ').toLowerCase();
  return KPOP_GENRES.some(kpopGenre => genreString.includes(kpopGenre));
}

/**
 * Main function to determine if an artist is likely K-pop
 */
export function isKpopArtist(artist: ArtistData): boolean {
  const { name, genres = [], popularity = 0 } = artist;
  
  // Direct genre match is strongest indicator
  if (hasKpopGenres(genres)) {
    return true;
  }
  
  // Korean characters in name
  if (hasKoreanCharacters(name)) {
    return true;
  }
  
  // Known K-pop artist name patterns
  if (matchesKpopNamePatterns(name)) {
    return true;
  }
  
  // For high-popularity artists, check if name has Korean-style characteristics
  if (popularity >= HIGH_POPULARITY_THRESHOLD) {
    // Artists with single names (common in K-pop)
    if (name.split(' ').length === 1 && name.length >= 3 && name.length <= 8) {
      // Additional checks for Korean-style names
      const lowerName = name.toLowerCase();
      
      // Common K-pop name endings
      if (/^(ae|yu|ji|mi|na|ra|sa|da|ga|ka|ya|wa|ha|la|ma|ta|pa|ba|cha|sha|ja|za)/.test(lowerName) ||
          /(eon|eun|ook|oong|ang|ing|ung|yeon|hyun|min|bin|jin|rin|lin|won|sun|hun|kyung|young|seung|hoon|joon)$/.test(lowerName)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Filters an array of artists to return only K-pop artists
 */
export function filterKpopArtists<T extends ArtistData>(artists: T[]): T[] {
  return artists.filter(artist => isKpopArtist(artist));
}

/**
 * Get confidence score for K-pop classification (0-1)
 */
export function getKpopConfidenceScore(artist: ArtistData): number {
  const { name, genres = [], popularity = 0 } = artist;
  let score = 0;
  
  // Genre match (highest confidence)
  if (hasKpopGenres(genres)) {
    score += 0.8;
  }
  
  // Korean characters
  if (hasKoreanCharacters(name)) {
    score += 0.7;
  }
  
  // Name pattern match
  if (matchesKpopNamePatterns(name)) {
    score += 0.6;
  }
  
  // Popularity bonus
  if (popularity >= HIGH_POPULARITY_THRESHOLD) {
    score += 0.2;
  }
  
  return Math.min(score, 1.0);
}