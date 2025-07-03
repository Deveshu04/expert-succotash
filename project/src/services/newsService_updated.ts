import { NewsItem } from '../types';

interface MarketauxArticle {
  uuid: string;
  title: string;
  description: string;
  snippet: string;
  url: string;
  image_url: string;
  language: string;
  published_at: string;
  source: string;
  relevance_score: number;
  entities: Array<{
    symbol: string;
    name: string;
    exchange: string;
    exchange_long: string;
    country: string;
    type: string;
    industry: string;
    match_score: number;
    sentiment_score: number;
    highlights: Array<{
      highlight: string;
      sentiment: number;
      highlighted_in: string;
    }>;
  }>;
  similar: string[];
}

interface MarketauxResponse {
  meta: {
    found: number;
    returned: number;
    limit: number;
    page: number;
  };
  data: MarketauxArticle[];
}

const MARKETAUX_BASE_URL = 'https://api.marketaux.com/v1/news/all';

const getApiKey = () => {
  const apiKey = import.meta.env.VITE_MARKETAUX_API_KEY;
  if (!apiKey) {
    throw new Error('Marketaux API key not found. Please add VITE_MARKETAUX_API_KEY to your .env file');
  }
  return apiKey;
};

// Cache for news data to avoid excessive API calls
let newsCache: { data: NewsItem[]; timestamp: number } | null = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export const fetchNews = async (): Promise<NewsItem[]> => {
  try {
    // Check cache first
    if (newsCache && Date.now() - newsCache.timestamp < CACHE_DURATION) {
      console.log('📰 Using cached news data');
      return newsCache.data;
    }

    console.log('📰 Fetching fresh news from Marketaux API...');
    const apiKey = getApiKey();

    // Create date for last 24 hours - using current time minus 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const publishedAfter = twentyFourHoursAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    console.log('📰 Fetching news from last 24 hours since:', publishedAfter);
    console.log('📰 Current time:', new Date().toISOString());

    // Request more articles to account for filtering
    const params = new URLSearchParams({
      api_token: apiKey,
      countries: 'in', // India
      filter_entities: 'true',
      limit: '100', // Increased limit to get more articles before filtering
      published_after: publishedAfter,
      sort: 'published_desc',
      language: 'en'
    });

    const url = `${MARKETAUX_BASE_URL}?${params}`;
    console.log('📰 API URL:', url.replace(apiKey, 'API_KEY_HIDDEN'));

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📰 Marketaux API error:', response.status, response.statusText, errorText);
      throw new Error(`Marketaux API error: ${response.status} ${response.statusText}`);
    }

    const data: MarketauxResponse = await response.json();
    console.log('📰 Raw articles received from API:', data.data.length);
    console.log('📰 API Meta - Found:', data.meta.found, 'Returned:', data.meta.returned);

    // Double-check 24-hour filter (API sometimes returns older articles)
    const twentyFourHoursAgoTimestamp = Date.now() - (24 * 60 * 60 * 1000);

    const recentArticles = data.data.filter(article => {
      const articleTime = new Date(article.published_at).getTime();
      const isWithin24Hours = articleTime >= twentyFourHoursAgoTimestamp;

      if (!isWithin24Hours) {
        console.log('📰 Filtering out older article:', {
          title: article.title.substring(0, 50),
          published: article.published_at,
          hoursAgo: Math.round((Date.now() - articleTime) / (1000 * 60 * 60))
        });
      }

      return isWithin24Hours;
    });

    console.log('📰 Articles within 24 hours:', recentArticles.length);

    const newsItems: NewsItem[] = recentArticles.map(article => ({
      id: article.uuid,
      headline: article.title,
      summary: article.description || article.snippet || '',
      source: article.source,
      timestamp: article.published_at,
      url: article.url,
      relevantStocks: article.entities
        .filter(entity => entity.type === 'equity' && entity.country === 'in')
        .map(entity => entity.symbol)
        .filter(symbol => symbol && symbol.length > 0),
      category: categorizeNews(article.title, article.description || article.snippet || '')
    }));

    // Enhanced filtering for Indian market relevance
    const marketRelevantNews = newsItems.filter(item => {
      const hasStocks = item.relevantStocks.length > 0;
      const isMarketRelevant = checkMarketRelevance(item.headline, item.summary);
      const isIndianRelevant = checkIndianMarketRelevance(item.headline, item.summary);

      const isRelevant = hasStocks || isMarketRelevant || isIndianRelevant;

      if (!isRelevant) {
        console.log('📰 Filtering out non-market article:', item.headline.substring(0, 50));
      }

      return isRelevant;
    });

    console.log('📰 Market relevant articles:', marketRelevantNews.length);

    // If we have too few relevant articles, include some general news
    let finalNews = marketRelevantNews;

    if (marketRelevantNews.length < 15) {
      console.log('📰 Too few market-relevant articles, adding general news...');
      const additionalNews = newsItems
        .filter(item => !marketRelevantNews.includes(item))
        .slice(0, 15 - marketRelevantNews.length);

      finalNews = [...marketRelevantNews, ...additionalNews];
      console.log('📰 Added', additionalNews.length, 'additional articles');
    }

    // Sort by timestamp (most recent first)
    finalNews.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    console.log('📰 Final article count:', finalNews.length);
    console.log('📰 Date range:', {
      oldest: finalNews[finalNews.length - 1]?.timestamp,
      newest: finalNews[0]?.timestamp
    });

    // Cache the result
    newsCache = { data: finalNews, timestamp: Date.now() };

    return finalNews;
  } catch (error) {
    console.error('📰 Error fetching news from Marketaux:', error);
    console.log('📰 Using fallback news data');
    return getFallbackNews();
  }
};

export const filterNewsByStocks = (news: NewsItem[], stocks: string[]): NewsItem[] => {
  const filtered = news.filter(item =>
    item.relevantStocks.some(stock =>
      stocks.some(userStock => userStock.toUpperCase() === stock.toUpperCase())
    ) ||
    // Also check if stock symbols are mentioned in headline or summary
    stocks.some(userStock =>
      item.headline.toLowerCase().includes(userStock.toLowerCase()) ||
      item.summary.toLowerCase().includes(userStock.toLowerCase())
    )
  );

  console.log('📰 Portfolio filter: From', news.length, 'to', filtered.length, 'articles');
  return filtered;
};

// Function to fetch news for specific stocks
export const fetchStockSpecificNews = async (symbols: string[]): Promise<NewsItem[]> => {
  try {
    const apiKey = getApiKey();

    // Create symbols parameter for Marketaux
    const symbolsParam = symbols.map(symbol => `${symbol}.NSE,${symbol}.BSE`).join(',');

    // Use 24-hour format for consistency
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const publishedAfter = twentyFourHoursAgo.toISOString().split('T')[0];

    const params = new URLSearchParams({
      api_token: apiKey,
      symbols: symbolsParam,
      filter_entities: 'true',
      limit: '50',
      published_after: publishedAfter,
      sort: 'published_desc',
      language: 'en'
    });

    const response = await fetch(`${MARKETAUX_BASE_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`Marketaux API error: ${response.status} ${response.statusText}`);
    }

    const data: MarketauxResponse = await response.json();

    return data.data.map(article => ({
      id: article.uuid,
      headline: article.title,
      summary: article.description || article.snippet || '',
      source: article.source,
      timestamp: article.published_at,
      url: article.url,
      relevantStocks: article.entities
        .filter(entity => entity.type === 'equity')
        .map(entity => entity.symbol.split('.')[0]) // Remove exchange suffix
        .filter(symbol => symbols.includes(symbol.toUpperCase())),
      category: categorizeNews(article.title, article.description || article.snippet || '')
    }));
  } catch (error) {
    console.error('Error fetching stock-specific news:', error);
    return [];
  }
};

// Helper function to categorize news
const categorizeNews = (title: string, description: string): 'market' | 'company' | 'policy' | 'economy' => {
  const text = (title + ' ' + description).toLowerCase();

  if (text.includes('rbi') || text.includes('policy') || text.includes('regulation') || text.includes('government')) {
    return 'policy';
  }

  if (text.includes('gdp') || text.includes('inflation') || text.includes('economy') || text.includes('economic')) {
    return 'economy';
  }

  if (text.includes('nifty') || text.includes('sensex') || text.includes('market') || text.includes('index')) {
    return 'market';
  }

  return 'company';
};

// Enhanced market relevance checking
const checkMarketRelevance = (headline: string, summary: string): boolean => {
  const text = (headline + ' ' + summary).toLowerCase();
  const marketKeywords = [
    'nifty', 'sensex', 'bse', 'nse', 'market', 'stock', 'share', 'equity',
    'trading', 'investor', 'investment', 'portfolio', 'mutual fund',
    'ipo', 'listing', 'earnings', 'quarterly', 'results', 'profit',
    'revenue', 'dividend', 'bonus', 'split', 'merger', 'acquisition',
    'bank', 'financial', 'sector', 'industry', 'corporate'
  ];

  return marketKeywords.some(keyword => text.includes(keyword));
};

// Enhanced Indian market relevance checking
const checkIndianMarketRelevance = (headline: string, summary: string): boolean => {
  const text = (headline + ' ' + summary).toLowerCase();
  const indianKeywords = [
    'india', 'indian', 'mumbai', 'delhi', 'bangalore', 'hyderabad',
    'rupee', 'inr', 'rbi', 'sebi', 'modi', 'budget', 'gst',
    'reliance', 'tata', 'adani', 'ambani', 'infosys', 'wipro',
    'hdfc', 'icici', 'sbi', 'axis', 'kotak', 'bharti', 'airtel',
    'coal india', 'ongc', 'ntpc', 'power grid', 'oil india',
    'larsen', 'toubro', 'mahindra', 'maruti', 'hero motocorp'
  ];

  return indianKeywords.some(keyword => text.includes(keyword));
};

// Fallback news data when API is unavailable
const getFallbackNews = (): NewsItem[] => {
  return [
    {
      id: 'fallback-1',
      headline: 'Indian Markets Show Resilience Amid Global Uncertainty',
      summary: 'Nifty 50 and Sensex maintain steady performance as investors focus on domestic fundamentals and upcoming earnings season.',
      source: 'Market News',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      url: '#',
      relevantStocks: ['NIFTY50'],
      category: 'market'
    },
    {
      id: 'fallback-2',
      headline: 'RBI Monetary Policy Decision Awaited by Market Participants',
      summary: 'Investors and analysts closely watching for any changes in repo rate and policy stance in the upcoming RBI meeting.',
      source: 'Economic News',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      url: '#',
      relevantStocks: ['HDFCBANK', 'ICICIBANK'],
      category: 'policy'
    },
    {
      id: 'fallback-3',
      headline: 'Technology Sector Leads Market Rally',
      summary: 'IT stocks show strong performance driven by digital transformation demand and favorable currency movements.',
      source: 'Tech News',
      timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      url: '#',
      relevantStocks: ['TCS', 'INFY', 'WIPRO'],
      category: 'company'
    }
  ];
};

// Function to clear news cache (useful for testing)
export const clearNewsCache = () => {
  newsCache = null;
  console.log('📰 News cache cleared');
};

// Function to check if we're using cached data
export const isCacheActive = (): boolean => {
  return newsCache !== null && Date.now() - newsCache.timestamp < CACHE_DURATION;
};

// Add debug function to test API directly
export const debugMarketauxAPI = async (): Promise<void> => {
  try {
    console.log('🧪 Debug: Testing Marketaux API directly...');

    const apiKey = import.meta.env.VITE_MARKETAUX_API_KEY;
    console.log('🔑 API Key present:', apiKey ? 'Yes' : 'No');
    console.log('🔑 API Key length:', apiKey ? apiKey.length : 0);

    if (!apiKey) {
      console.error('❌ No API key found in environment variables');
      return;
    }

    // Test with Indian market specifically
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const publishedAfter = twentyFourHoursAgo.toISOString().split('T')[0];

    const params = new URLSearchParams({
      api_token: apiKey,
      countries: 'in',
      limit: '10',
      published_after: publishedAfter,
      language: 'en'
    });

    const testUrl = `${MARKETAUX_BASE_URL}?${params}`;
    console.log('📡 Test URL (Indian market):', testUrl.replace(apiKey, 'API_KEY_HIDDEN'));

    const response = await fetch(testUrl);
    console.log('📊 Response status:', response.status);
    console.log('📊 Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API Test successful!');
    console.log('📊 Response meta:', data.meta);
    console.log('📰 Sample articles:', data.data.slice(0, 3).map((article: any) => ({
      title: article.title.substring(0, 60),
      source: article.source,
      published: article.published_at
    })));

  } catch (error) {
    console.error('💥 Network/Fetch Error:', error);
  }
};
