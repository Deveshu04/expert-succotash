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
const CACHE_DURATION = 20 * 60 * 1000; // 20 minutes (increased from 10)

// Check for cached news in localStorage on module initialization
try {
  const storedCache = localStorage.getItem('newsCache');
  if (storedCache) {
    const parsedCache = JSON.parse(storedCache);
    if (Date.now() - parsedCache.timestamp < CACHE_DURATION) {
      console.log('Loaded news cache from localStorage');
      newsCache = parsedCache;
    } else {
      console.log('Found expired news cache in localStorage, will refresh');
    }
  }
} catch (error) {
  console.error('Error loading news cache from localStorage:', error);
}

export const fetchNews = async (): Promise<NewsItem[]> => {
  try {
    // Check memory cache first
    if (newsCache && Date.now() - newsCache.timestamp < CACHE_DURATION) {
      console.log('Using cached news data');
      return newsCache.data;
    }

    console.log('Fetching fresh news from Marketaux API...');
    const apiKey = getApiKey();
    
    // Use 24 hours for better fresh news
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const publishedAfter = twentyFourHoursAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    console.log('Fetching news from last 24 hours since:', publishedAfter);
    console.log('Current time:', new Date().toISOString());

    // Try multiple strategies to get more articles
    const allArticles: MarketauxArticle[] = [];

    // Strategy 1: Try without country filter (global news including India)
    console.log('📡 Strategy 1: Fetching global news...');
    const globalParams = new URLSearchParams({
      api_token: apiKey,
      filter_entities: 'true',
      limit: '50', // Reduce per request to avoid hitting limits
      published_after: publishedAfter,
      sort: 'published_desc',
      language: 'en'
    });

    const globalResponse = await fetch(`${MARKETAUX_BASE_URL}?${globalParams}`);
    if (globalResponse.ok) {
      const globalData: MarketauxResponse = await globalResponse.json();
      console.log('📊 Global articles received:', globalData.data?.length || 0);
      if (globalData.data) {
        allArticles.push(...globalData.data);
      }
    }

    // Strategy 2: Try India-specific news if we need more
    if (allArticles.length < 10) {
      console.log('📡 Strategy 2: Fetching India-specific news...');
      const indiaParams = new URLSearchParams({
        api_token: apiKey,
        countries: 'in',
        filter_entities: 'true',
        limit: '20',
        published_after: publishedAfter,
        sort: 'published_desc',
        language: 'en'
      });

      const indiaResponse = await fetch(`${MARKETAUX_BASE_URL}?${indiaParams}`);
      if (indiaResponse.ok) {
        const indiaData: MarketauxResponse = await indiaResponse.json();
        console.log('📊 India articles received:', indiaData.data?.length || 0);
        if (indiaData.data) {
          // Avoid duplicates
          const newArticles = indiaData.data.filter(article =>
            !allArticles.some(existing => existing.uuid === article.uuid)
          );
          allArticles.push(...newArticles);
        }
      }
    }

    // Strategy 3: Try financial/business keywords if still need more
    if (allArticles.length < 15) {
      console.log('📡 Strategy 3: Fetching financial keyword news...');
      const keywords = ['stock', 'market', 'investment', 'financial', 'economy'];

      for (const keyword of keywords) {
        if (allArticles.length >= 20) break;

        const keywordParams = new URLSearchParams({
          api_token: apiKey,
          search: keyword,
          filter_entities: 'true',
          limit: '10',
          published_after: publishedAfter,
          sort: 'published_desc',
          language: 'en'
        });

        try {
          const keywordResponse = await fetch(`${MARKETAUX_BASE_URL}?${keywordParams}`);
          if (keywordResponse.ok) {
            const keywordData: MarketauxResponse = await keywordResponse.json();
            console.log(`📊 ${keyword} articles received:`, keywordData.data?.length || 0);
            if (keywordData.data) {
              const newArticles = keywordData.data.filter(article =>
                !allArticles.some(existing => existing.uuid === article.uuid)
              );
              allArticles.push(...newArticles.slice(0, 5)); // Limit per keyword
            }
          }
        } catch (error) {
          console.log(`⚠️ Failed to fetch ${keyword} news:`, error);
        }
      }
    }

    console.log('📊 Total unique articles collected:', allArticles.length);
    console.log('🔍 API reported found vs collected:', {
      reported: 'Multiple requests',
      collected: allArticles.length
    });

    // Remove duplicates based on UUID
    const uniqueArticles = allArticles.filter((article, index, self) =>
      index === self.findIndex(a => a.uuid === article.uuid)
    );

    console.log('📊 Unique articles after deduplication:', uniqueArticles.length);

    // Filter by time range (24 hours for recent, but include older if needed)
    const twentyFourHoursAgoTimestamp = Date.now() - (24 * 60 * 60 * 1000);
    const threeDaysAgoTimestamp = Date.now() - (3 * 24 * 60 * 60 * 1000);

    const recentArticles = uniqueArticles.filter(article => {
      const articleTime = new Date(article.published_at).getTime();
      const isWithinThreeDays = articleTime >= threeDaysAgoTimestamp;

      if (!isWithinThreeDays) {
        console.log('Filtering out article older than 3 days:', {
          title: article.title.substring(0, 50),
          published: article.published_at,
          daysAgo: Math.round((Date.now() - articleTime) / (1000 * 60 * 60 * 24))
        });
      }

      return isWithinThreeDays;
    });

    console.log('Articles within 3 days:', recentArticles.length);

    const newsItems: NewsItem[] = recentArticles.map(article => {
      const articleTime = new Date(article.published_at).getTime();
      const isWithin24Hours = articleTime >= twentyFourHoursAgoTimestamp;

      return {
        id: article.uuid,
        headline: article.title,
        summary: article.description || article.snippet || '',
        source: article.source,
        timestamp: article.published_at,
        url: article.url,
        relevantStocks: article.entities
          ?.filter(entity => entity.type === 'equity' && entity.country === 'in')
          .map(entity => entity.symbol)
          .filter(symbol => symbol && symbol.length > 0) || [],
        category: categorizeNews(article.title, article.description || article.snippet || ''),
        isRecent: isWithin24Hours
      };
    });

    // More lenient filtering - include more articles
    const marketRelevantNews = newsItems.filter(item => {
      const hasStocks = item.relevantStocks.length > 0;
      const isMarketRelevant = checkMarketRelevance(item.headline, item.summary);
      const isIndianRelevant = checkIndianMarketRelevance(item.headline, item.summary);
      const isBusinessRelevant = checkBusinessRelevance(item.headline, item.summary);

      const isRelevant = hasStocks || isMarketRelevant || isIndianRelevant || isBusinessRelevant;

      if (!isRelevant && newsItems.length < 15) {
        // Be more lenient if we have few articles
        const hasFinancialWords = /\b(money|finance|business|company|corporate|industry|sector|economic|growth|profit|revenue|earnings|investment|trade|commercial)\b/i.test(item.headline + ' ' + item.summary);
        return hasFinancialWords;
      }

      return isRelevant;
    });

    console.log('Relevant articles after filtering:', marketRelevantNews.length);

    // If we still have too few articles, include more general news
    let finalNews = marketRelevantNews;

    if (marketRelevantNews.length < 10) {
      console.log('Too few relevant articles, including more general news...');

      const additionalNews = newsItems
        .filter(item => !marketRelevantNews.includes(item))
        .filter(item => !isCompletelyIrrelevant(item.headline, item.summary))
        .slice(0, 15 - marketRelevantNews.length);

      finalNews = [...marketRelevantNews, ...additionalNews];
      console.log('Added', additionalNews.length, 'additional articles');
    }

    // Sort by recency and relevance
    finalNews.sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();

      // Prioritize recent articles
      if (a.isRecent && !b.isRecent) return -1;
      if (!a.isRecent && b.isRecent) return 1;

      // Then sort by time
      return bTime - aTime;
    });

    // Ensure we have at least some articles
    if (finalNews.length === 0) {
      console.log('⚠️ No articles found, using fallback data');
      return getFallbackNews();
    }

    console.log('Final article count:', finalNews.length);
    console.log('Recent articles (24h):', finalNews.filter(item => item.isRecent).length);
    console.log('Date range:', {
      oldest: finalNews[finalNews.length - 1]?.timestamp,
      newest: finalNews[0]?.timestamp
    });

    // Cache the result
    newsCache = { data: finalNews, timestamp: Date.now() };

    // Also store in localStorage
    try {
      localStorage.setItem('newsCache', JSON.stringify(newsCache));
      console.log('News cache saved to localStorage');
    } catch (error) {
      console.error('Error saving news cache to localStorage:', error);
    }

    return finalNews;
  } catch (error) {
    console.error('Error fetching news from Marketaux:', error);
    console.log('Using fallback news data');
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

  console.log('Portfolio filter: From', news.length, 'to', filtered.length, 'articles');
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

// Function to get cached news without making an API call
export const getCachedNews = (): NewsItem[] => {
  try {
    // First check memory cache
    if (newsCache && Date.now() - newsCache.timestamp < CACHE_DURATION) {
      console.log('Using in-memory cached news data');
      return newsCache.data;
    }

    // Then check localStorage
    const storedCache = localStorage.getItem('newsCache');
    if (storedCache) {
      const parsedCache = JSON.parse(storedCache);
      if (Date.now() - parsedCache.timestamp < CACHE_DURATION) {
        console.log('Using localStorage cached news data');
        // Update memory cache
        newsCache = parsedCache;
        return parsedCache.data;
      }
    }

    // No valid cache found
    console.log('No valid news cache found');
    return [];
  } catch (error) {
    console.error('Error retrieving cached news:', error);
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

// Check business relevance (new function)
const checkBusinessRelevance = (headline: string, summary: string): boolean => {
  const text = (headline + ' ' + summary).toLowerCase();
  const businessKeywords = [
    'merger', 'acquisition', 'joint venture', 'partnership', 'collaboration',
    'investment', 'funding', 'startup', 'ceo', 'founder', 'launch',
    'product', 'service', 'technology', 'innovation', 'research',
    'development', 'patent', 'trademark', 'copyright', 'licensing',
    'regulation', 'compliance', 'audit', 'financial', 'report',
    'statement', 'forecast', 'guidance', 'risk', 'challenge', 'opportunity'
  ];

  return businessKeywords.some(keyword => text.includes(keyword));
};

// Check if the article is completely irrelevant (new function)
const isCompletelyIrrelevant = (headline: string, summary: string): boolean => {
  const text = (headline + ' ' + summary).toLowerCase();
  const irrelevantKeywords = [
    'sports', 'entertainment', 'celebrity', 'gossip', 'reality show',
    'movie', 'film', 'music', 'concert', 'theater', 'art',
    'fashion', 'beauty', 'lifestyle', 'food', 'recipe',
    'travel', 'vacation', 'holiday', 'leisure', 'hobby',
    'pets', 'animal', 'nature', 'environment', 'weather',
    'science', 'health', 'fitness', 'wellness', 'meditation',
    'yoga', 'spirituality', 'philosophy', 'religion', 'mythology'
  ];

  return irrelevantKeywords.some(keyword => text.includes(keyword));
};

// Fallback news data when API is unavailable
const getFallbackNews = (): NewsItem[] => {
  const currentTime = Date.now();

  return [
    {
      id: 'fallback-1',
      headline: 'Indian Markets Show Resilience Amid Global Uncertainty',
      summary: 'Nifty 50 and Sensex maintain steady performance as investors focus on domestic fundamentals and upcoming earnings season. Market participants remain cautiously optimistic.',
      source: 'Market News',
      timestamp: new Date(currentTime - 1000 * 60 * 30).toISOString(),
      url: '#',
      relevantStocks: ['NIFTY50'],
      category: 'market',
      isRecent: true
    },
    {
      id: 'fallback-2',
      headline: 'RBI Monetary Policy Decision Awaited by Market Participants',
      summary: 'Investors and analysts closely watching for any changes in repo rate and policy stance in the upcoming RBI meeting. Banking sector stocks show mixed performance.',
      source: 'Economic News',
      timestamp: new Date(currentTime - 1000 * 60 * 60).toISOString(),
      url: '#',
      relevantStocks: ['HDFCBANK', 'ICICIBANK'],
      category: 'policy',
      isRecent: true
    },
    {
      id: 'fallback-3',
      headline: 'Technology Sector Leads Market Rally',
      summary: 'IT stocks show strong performance driven by digital transformation demand and favorable currency movements. Major players report strong quarterly results.',
      source: 'Tech News',
      timestamp: new Date(currentTime - 1000 * 60 * 90).toISOString(),
      url: '#',
      relevantStocks: ['TCS', 'INFY', 'WIPRO'],
      category: 'company',
      isRecent: true
    },
    {
      id: 'fallback-4',
      headline: 'Reliance Industries Reports Strong Q4 Earnings',
      summary: 'Oil-to-chemicals giant Reliance Industries posted robust quarterly earnings, beating analyst estimates. Retail and telecom segments show continued growth.',
      source: 'Business News',
      timestamp: new Date(currentTime - 1000 * 60 * 120).toISOString(),
      url: '#',
      relevantStocks: ['RELIANCE'],
      category: 'company',
      isRecent: true
    },
    {
      id: 'fallback-5',
      headline: 'HDFC Bank Maintains Leadership in Digital Banking',
      summary: 'Private sector lender continues to expand its digital footprint with new fintech partnerships and innovative banking solutions for retail customers.',
      source: 'Banking News',
      timestamp: new Date(currentTime - 1000 * 60 * 150).toISOString(),
      url: '#',
      relevantStocks: ['HDFCBANK'],
      category: 'company',
      isRecent: true
    },
    {
      id: 'fallback-6',
      headline: 'FII Flows Show Recovery After Recent Volatility',
      summary: 'Foreign institutional investors return to Indian markets with net inflows recorded this week, signaling renewed confidence in domestic growth prospects.',
      source: 'Investment News',
      timestamp: new Date(currentTime - 1000 * 60 * 180).toISOString(),
      url: '#',
      relevantStocks: ['NIFTY50'],
      category: 'market',
      isRecent: true
    },
    {
      id: 'fallback-7',
      headline: 'Adani Group Stocks Rebound on Infrastructure Push',
      summary: 'Adani portfolio companies see strong investor interest as the group announces major infrastructure projects across renewable energy and logistics.',
      source: 'Infrastructure News',
      timestamp: new Date(currentTime - 1000 * 60 * 210).toISOString(),
      url: '#',
      relevantStocks: ['ADANIGREEN'],
      category: 'company',
      isRecent: true
    },
    {
      id: 'fallback-8',
      headline: 'Government Announces New Manufacturing Incentives',
      summary: 'Centre unveils fresh policy measures to boost domestic manufacturing, with focus on electronics, textiles, and automotive sectors.',
      source: 'Policy News',
      timestamp: new Date(currentTime - 1000 * 60 * 240).toISOString(),
      url: '#',
      relevantStocks: ['MARUTI', 'MAHINDRA'],
      category: 'policy',
      isRecent: true
    },
    {
      id: 'fallback-9',
      headline: 'Pharmaceutical Sector Gains on Export Demand',
      summary: 'Indian pharma companies report increased export orders, particularly in generic drugs and active pharmaceutical ingredients (APIs).',
      source: 'Pharma News',
      timestamp: new Date(currentTime - 1000 * 60 * 270).toISOString(),
      url: '#',
      relevantStocks: ['SUNPHARMA', 'DRREDDY'],
      category: 'company',
      isRecent: true
    },
    {
      id: 'fallback-10',
      headline: 'Steel Industry Outlook Remains Positive',
      summary: 'Domestic steel demand continues to grow driven by infrastructure projects and construction activity. Major steel producers report capacity expansion plans.',
      source: 'Steel News',
      timestamp: new Date(currentTime - 1000 * 60 * 300).toISOString(),
      url: '#',
      relevantStocks: ['TATASTEEL', 'JSWSTEEL'],
      category: 'company',
      isRecent: true
    },
    {
      id: 'fallback-11',
      headline: 'Auto Sector Shows Signs of Recovery',
      summary: 'Vehicle sales data indicates improving consumer demand, with both passenger and commercial vehicle segments showing growth momentum.',
      source: 'Auto News',
      timestamp: new Date(currentTime - 1000 * 60 * 330).toISOString(),
      url: '#',
      relevantStocks: ['MARUTI', 'TATAMOTORS'],
      category: 'company',
      isRecent: true
    },
    {
      id: 'fallback-12',
      headline: 'Renewable Energy Investments Surge',
      summary: 'India attracts record investments in renewable energy sector as the country accelerates towards its clean energy targets.',
      source: 'Energy News',
      timestamp: new Date(currentTime - 1000 * 60 * 360).toISOString(),
      url: '#',
      relevantStocks: ['ADANIGREEN', 'TATAPOWER'],
      category: 'economy',
      isRecent: true
    },
    {
      id: 'fallback-13',
      headline: 'Digital Payment Adoption Continues Growth',
      summary: 'UPI transactions hit new records as digital payment adoption accelerates across urban and rural markets.',
      source: 'Fintech News',
      timestamp: new Date(currentTime - 1000 * 60 * 390).toISOString(),
      url: '#',
      relevantStocks: ['PAYTM', 'HDFCBANK'],
      category: 'company',
      isRecent: true
    },
    {
      id: 'fallback-14',
      headline: 'Startup Ecosystem Attracts Global Attention',
      summary: 'Indian startups continue to attract significant venture capital funding, with several new unicorns emerging across different sectors.',
      source: 'Startup News',
      timestamp: new Date(currentTime - 1000 * 60 * 420).toISOString(),
      url: '#',
      relevantStocks: ['NYKAA', 'ZOMATO'],
      category: 'company',
      isRecent: false
    },
    {
      id: 'fallback-15',
      headline: 'Monsoon Forecast Positive for Agricultural Sector',
      summary: 'Weather department predicts normal monsoon, raising hopes for good agricultural output and rural demand recovery.',
      source: 'Agriculture News',
      timestamp: new Date(currentTime - 1000 * 60 * 450).toISOString(),
      url: '#',
      relevantStocks: ['ITC', 'UBL'],
      category: 'economy',
      isRecent: false
    }
  ];
};

// Function to clear news cache (useful for testing)
export const clearNewsCache = () => {
  newsCache = null;
  console.log('News cache cleared');
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

    // Simple test request with correct endpoint
    const params = new URLSearchParams({
      api_token: apiKey,
      countries: 'us', // Try US first as it might have more data
      limit: '3',
      language: 'en'
    });

    const testUrl = `${MARKETAUX_BASE_URL}?${params}`;
    console.log('📡 Test URL (corrected):', testUrl.replace(apiKey, 'API_KEY_HIDDEN'));

    const response = await fetch(testUrl);
    console.log('📊 Response status:', response.status);
    console.log('📊 Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);

      // Check for common error types
      if (response.status === 401) {
        console.error('🔐 Authentication failed - API key might be invalid');
      } else if (response.status === 429) {
        console.error('⏰ Rate limit exceeded - too many requests');
      } else if (response.status === 403) {
        console.error('🚫 Access forbidden - check API permissions');
      } else if (response.status === 404) {
        console.error('🔍 Endpoint not found - trying alternative endpoints...');

        // Try alternative endpoints
        const alternatives = [
          'https://api.marketaux.com/v1/news',
          'https://api.marketaux.com/news/all'
        ];

        for (const altUrl of alternatives) {
          console.log(`🔄 Trying alternative: ${altUrl}`);
          try {
            const altResponse = await fetch(`${altUrl}?${params}`);
            console.log(`📊 Alt response status: ${altResponse.status}`);
            if (altResponse.ok) {
              const altData = await altResponse.json();
              console.log('✅ Alternative endpoint works!');
              console.log('📊 Response meta:', altData.meta || 'No meta');
              return;
            }
          } catch (e) {
            console.log(`❌ Alternative ${altUrl} failed`);
          }
        }
      }
      return;
    }

    const data = await response.json();
    console.log('✅ API Test successful!');
    console.log('📊 Response meta:', data.meta);
    console.log('📰 Sample data:', data.data?.[0] ? {
      title: data.data[0].title,
      source: data.data[0].source
    } : 'No articles found');

  } catch (error) {
    console.error('💥 Network/Fetch Error:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('🌐 This might be a CORS or network connectivity issue');
    }
  }
};
