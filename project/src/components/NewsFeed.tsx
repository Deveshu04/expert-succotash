import React, { useState, useEffect } from 'react';
import { NewsItem } from '../types';
import NewsCard from './NewsCard';
import { fetchNews, filterNewsByStocks, clearNewsCache, isCacheActive, debugMarketauxAPI } from '../services/newsService';
import { Newspaper, Filter, RefreshCw, AlertCircle, CheckCircle, Bug } from 'lucide-react';

interface NewsFeedProps {
  portfolioStocks: string[];
  onNewsUpdate: (news: NewsItem[]) => void;
}

const NewsFeed: React.FC<NewsFeedProps> = ({ portfolioStocks, onNewsUpdate }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'portfolio'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const loadNews = async () => {
    try {
      setLoading(true);
      const newsData = await fetchNews();
      console.log('NewsFeed: Raw news data received:', newsData.length);
      console.log('NewsFeed: Article IDs:', newsData.map(item => ({ id: item.id, title: item.headline.substring(0, 30) })));

      // Check for duplicate IDs
      const uniqueIds = new Set(newsData.map(item => item.id));
      if (uniqueIds.size !== newsData.length) {
        console.warn('Duplicate article IDs found!', newsData.length - uniqueIds.size, 'duplicates');
      }

      setNews(newsData);
      onNewsUpdate(newsData);
      setLastUpdated(new Date());

      // Check if we're using fallback data (fallback IDs start with 'fallback-')
      const usingFallback = newsData.some(item => item.id.startsWith('fallback-'));
      setIsUsingFallback(usingFallback);
    } catch (error) {
      console.error('Failed to fetch news:', error);
      setIsUsingFallback(true);
    } finally {
      setLoading(false);
    }
  };

  const handleForceRefresh = () => {
    console.log('🔄 Force refresh triggered - clearing all caches');
    clearNewsCache();
    setNews([]); // Clear current news state
    setIsUsingFallback(false); // Reset fallback flag
    loadNews();
  };

  const handleDebugRefresh = async () => {
    console.log('🧪 Debug refresh - testing API and forcing fresh data');

    // Clear everything
    clearNewsCache();
    setNews([]);
    setIsUsingFallback(false);

    // Test API first
    await debugMarketauxAPI();

    // Then load news
    setTimeout(() => {
      loadNews();
    }, 1000);
  };

  useEffect(() => {
    loadNews();
    // Auto-refresh news every 5 minutes
    const interval = setInterval(loadNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredNews = activeTab === 'portfolio'
    ? (portfolioStocks.length > 0 ? filterNewsByStocks(news, portfolioStocks) : [])
    : news;

  // Only log when values actually change to reduce console spam
  useEffect(() => {
    console.log('NewsFeed State Update:', {
      activeTab,
      portfolioStocks: portfolioStocks.length,
      allNewsCount: news.length,
      filteredNewsCount: filteredNews.length
    });
  }, [activeTab, portfolioStocks.length, news.length, filteredNews.length]);

  if (activeTab === 'portfolio' && portfolioStocks.length === 0) {
    console.log('NewsFeed: Portfolio tab with no stocks - showing 0 articles');
  }

  console.log('NewsFeed: Articles to render:', filteredNews.map(item => ({ id: item.id, title: item.headline.substring(0, 30) })));

  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Newspaper className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-bold text-gray-900">Market News</h2>
            {isUsingFallback ? (
              <div className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>Demo Mode</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                <CheckCircle className="h-3 w-3" />
                <span>Live Data</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">
              Updated: {formatLastUpdated()}
              {isCacheActive() && <span className="text-xs text-blue-500 ml-1">(cached)</span>}
            </span>
            <button
              onClick={() => debugMarketauxAPI()}
              className="px-2 py-1 text-xs bg-purple-100 text-purple-600 rounded hover:bg-purple-200 transition-colors flex items-center space-x-1"
              title="Debug API (check console)"
            >
              <Bug className="h-3 w-3" />
              <span>Debug API</span>
            </button>
            <button
              onClick={loadNews}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-blue-500 transition-colors disabled:opacity-50"
              title="Refresh news"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleForceRefresh}
              disabled={loading}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
              title="Force refresh (clear cache)"
            >
              Force Refresh
            </button>
          </div>
        </div>

        {/* API Status Banner */}
        {isUsingFallback && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800">
                  <strong>Demo Mode:</strong> Unable to fetch live news from Marketaux API.
                  Showing sample data. Click "Debug API" and check console for details.
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  This could be due to API rate limits, network issues, or API key problems.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'all' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All News ({news.length})
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center space-x-1 ${
              activeTab === 'portfolio' 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Filter className="h-3 w-3" />
            <span>Portfolio ({portfolioStocks.length > 0 ? filterNewsByStocks(news, portfolioStocks).length : 0})</span>
          </button>
        </div>

        {/* 24 Hour News Indicator */}
        <div className="mt-3 text-xs text-gray-500 flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Showing news from the last 24 hours</span>
        </div>
      </div>

      <div className="px-6 pt-6 pb-6">
        <div className="max-h-[400px] overflow-y-auto rounded-lg border border-gray-100">
          <div className="p-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-gray-100 rounded-lg p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {activeTab === 'portfolio' ? (
                  <>
                    <Filter className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p>No news found for your portfolio stocks</p>
                    <p className="text-sm">Add some stocks to your portfolio to see relevant news</p>
                  </>
                ) : (
                  <>
                    <Newspaper className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p>No news available at the moment</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-gray-500 mb-3">
                  Showing {filteredNews.length} article{filteredNews.length !== 1 ? 's' : ''}
                </div>
                {filteredNews.map((item, index) => (
                  <div key={item.id} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
                    <NewsCard
                      news={item}
                      isFiltered={activeTab === 'portfolio'}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsFeed;
