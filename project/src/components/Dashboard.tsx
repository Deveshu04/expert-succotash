import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar, SidebarBody, SidebarLink } from './ui/sidebar';
import {
  IconDashboard,
  IconBriefcase,
  IconNews,
  IconBrain,
  IconLogout,
  IconUser
} from '@tabler/icons-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { API_URL } from '../config';
import PortfolioManager from './PortfolioManager';
import NewsFeed from './NewsFeed';
import AIInsights from './AIInsights';
import { Stock, NewsItem, AIInsight, MarketSentiment } from '../types';
import { analyzeNewsImpact, analyzeMarketSentiment } from '../services/aiService';

interface DashboardProps {
  user?: any;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // State for components
  const [portfolioStocks, setPortfolioStocks] = useState<Stock[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [marketSentiment, setMarketSentiment] = useState<MarketSentiment | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch portfolio from backend on mount
  useEffect(() => {
    const fetchPortfolio = async () => {
      setPortfolioLoading(true);
      setPortfolioError(null);
      try {
        const token = localStorage.getItem('token');
        console.log('Token found:', token ? 'Yes' : 'No');
        console.log('Token length:', token ? token.length : 0);

        if (!token) {
          throw new Error('No authentication token found. Please log in again.');
        }

        const res = await fetch(`${API_URL}/api/portfolio`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Portfolio fetch response status:', res.status);

        if (res.status === 401) {
          throw new Error('Authentication expired. Please log in again.');
        }

        if (res.status === 403) {
          throw new Error('Access forbidden. Please check your authentication.');
        }

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch portfolio (${res.status})`);
        }

        const data = await res.json();
        console.log('Portfolio data received:', data);
        setPortfolioStocks(data.portfolio || []);
      } catch (err: any) {
        console.error('Portfolio fetch error:', err);
        setPortfolioError(err.message || 'Error loading portfolio');

        // If authentication error, clear token and redirect to login
        if (err.message.includes('Authentication') || err.message.includes('forbidden')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Optionally redirect to login page
        }
      } finally {
        setPortfolioLoading(false);
      }
    };

    // Only fetch if user exists
    if (user) {
      fetchPortfolio();
    }
  }, [user]);

  // Load cached news on component mount
  useEffect(() => {
    // Import dynamically to prevent circular dependencies
    import('../services/newsService').then(({ getCachedNews }) => {
      const cachedNews = getCachedNews();
      if (cachedNews.length > 0) {
        console.log('Dashboard: Loaded', cachedNews.length, 'news articles from cache');
        setNews(cachedNews);
      } else {
        console.log('Dashboard: No cached news found, will need to fetch later');
      }
    });
  }, []);

  // Add stock to backend and update state
  const addStockToPortfolio = async (stock: Stock) => {
    setPortfolioLoading(true);
    setPortfolioError(null);
    try {
      const token = localStorage.getItem('token');
      console.log('Adding stock - Token available:', token ? 'Yes' : 'No');
      console.log('Adding stock - Token length:', token ? token.length : 0);
      console.log('Adding stock - Stock symbol:', stock.symbol);

      const res = await fetch(`${API_URL}/api/portfolio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          symbol: stock.symbol,
          quantity: stock.quantity || 1,
          purchasePrice: stock.price || 0
        })
      });

      console.log('Add stock response status:', res.status);

      if (res.status === 401 || res.status === 403) {
        // For authentication issues, update the UI but also add the stock locally
        console.warn('Authentication issue when adding stock, adding to local state only');

        // Add stock to local state even if the API call fails
        setPortfolioStocks(prev => {
          const existingIndex = prev.findIndex(s => s.symbol === stock.symbol);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex].quantity = (updated[existingIndex].quantity || 1) + (stock.quantity || 1);
            return updated;
          } else {
            return [...prev, stock];
          }
        });

        throw new Error(res.status === 401 ? 'Authentication expired' : 'Access forbidden');
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to add stock (${res.status})`);
      }

      // Refetch portfolio
      const data = await res.json();
      console.log('Stock added successfully, API response:', data);

      // Even if refetching fails, make sure we update the local state
      try {
        const portfolioRes = await fetch(`${API_URL}/api/portfolio`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (portfolioRes.ok) {
          const portfolioData = await portfolioRes.json();
          console.log('Portfolio data refetched after adding stock:', portfolioData);
          setPortfolioStocks(portfolioData.portfolio || []);
        } else {
          console.warn('Failed to refetch portfolio after adding stock, updating local state only');
          // Update local state since refetch failed
          setPortfolioStocks(prev => {
            const existingIndex = prev.findIndex(s => s.symbol === stock.symbol);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex].quantity = (updated[existingIndex].quantity || 1) + (stock.quantity || 1);
              return updated;
            } else {
              return [...prev, stock];
            }
          });
        }
      } catch (refetchError) {
        console.error('Error refetching portfolio after adding stock:', refetchError);
        // Update local state since refetch failed
        setPortfolioStocks(prev => {
          const existingIndex = prev.findIndex(s => s.symbol === stock.symbol);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex].quantity = (updated[existingIndex].quantity || 1) + (stock.quantity || 1);
            return updated;
          } else {
            return [...prev, stock];
          }
        });
      }
    } catch (err: any) {
      console.error('Error adding stock to portfolio:', err);
      setPortfolioError(err.message || 'Error adding stock');
    } finally {
      setPortfolioLoading(false);
    }
  };

  // Remove stock from backend and update state
  const removeStockFromPortfolio = async (symbol: string) => {
    setPortfolioLoading(true);
    setPortfolioError(null);
    try {
      const token = localStorage.getItem('token');
      console.log('Removing stock - Token available:', token ? 'Yes' : 'No');
      console.log('Removing stock - Symbol:', symbol);

      const res = await fetch(`${API_URL}/api/portfolio/${encodeURIComponent(symbol)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('Remove stock response status:', res.status);

      if (res.status === 401 || res.status === 403) {
        // For authentication issues, update the UI anyway
        console.warn('Authentication issue when removing stock, removing from local state only');

        // Remove stock from local state even if the API call fails
        setPortfolioStocks(prev => prev.filter(s => s.symbol !== symbol));

        throw new Error(res.status === 401 ? 'Authentication expired' : 'Access forbidden');
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to remove stock (${res.status})`);
      }

      // Update local state
      setPortfolioStocks(prev => prev.filter(s => s.symbol !== symbol));

      // Try to refetch portfolio
      try {
        const portfolioRes = await fetch(`${API_URL}/api/portfolio`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (portfolioRes.ok) {
          const portfolioData = await portfolioRes.json();
          console.log('Portfolio data refetched after removing stock:', portfolioData);
          setPortfolioStocks(portfolioData.portfolio || []);
        } else {
          console.warn('Failed to refetch portfolio after removing stock, using local state update');
        }
      } catch (refetchError) {
        console.error('Error refetching portfolio after removing stock:', refetchError);
      }
    } catch (err: any) {
      console.error('Error removing stock from portfolio:', err);
      setPortfolioError(err.message || 'Error removing stock');
    } finally {
      setPortfolioLoading(false);
    }
  };

  // Function to analyze AI insights
  const analyzeAIInsights = async () => {
    if (portfolioStocks.length === 0 || news.length === 0) {
      console.log('AI Analysis: Skipping analysis - no portfolio stocks or news available');
      return;
    }

    console.log('AI Analysis: Starting analysis for', portfolioStocks.length, 'stocks with', news.length, 'news items');
    setAiLoading(true);

    try {
      const stockSymbols = portfolioStocks.map(stock => stock.symbol);

      // Analyze portfolio insights
      console.log('AI Analysis: Analyzing news impact for stocks:', stockSymbols);
      const insights = await analyzeNewsImpact(news, stockSymbols);
      console.log('AI Analysis: Received', insights.length, 'insights');
      setAiInsights(insights);

      // Analyze market sentiment
      console.log('AI Analysis: Analyzing market sentiment...');
      const sentiment = await analyzeMarketSentiment(news);
      console.log('AI Analysis: Market sentiment:', sentiment.overall, 'with confidence:', sentiment.confidence);
      setMarketSentiment(sentiment);

      console.log('AI Analysis: Successfully completed AI analysis');
    } catch (error) {
      console.error('AI Analysis Error:', error);

      // Provide fallback data
      const fallbackInsights: AIInsight[] = portfolioStocks.map(stock => ({
        stock: stock.symbol,
        sentiment: 'neutral',
        impact: 'low',
        confidence: 0.4,
        reasoning: 'AI analysis temporarily unavailable. Using fallback analysis.',
        recommendation: 'Monitor stock performance and market conditions.'
      }));

      setAiInsights(fallbackInsights);
      setMarketSentiment({
        overall: 'neutral',
        confidence: 0.4,
        summary: 'AI market sentiment analysis temporarily unavailable.',
        keyFactors: ['System using fallback analysis', 'Monitor market conditions', 'Check news updates']
      });

      console.log('AI Analysis: Using fallback insights due to error');
    } finally {
      setAiLoading(false);
    }
  };

  // Effect to trigger AI analysis when portfolio or news changes
  useEffect(() => {
    if (portfolioStocks.length > 0 && news.length > 0) {
      console.log('AI Analysis: Portfolio or news updated, triggering analysis...');
      // Add a small delay to avoid rapid successive calls
      const timeoutId = setTimeout(() => {
        analyzeAIInsights();
      }, 2000);

      return () => clearTimeout(timeoutId);
    } else {
      console.log('AI Analysis: Clearing insights - insufficient data');
      setAiInsights([]);
      setMarketSentiment(null);
    }
  }, [portfolioStocks, news]);

  // Logout function
  const handleLogout = () => {
    console.log('Logging out user...');

    // Clear authentication data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Dispatch custom event to notify App component of auth change
    window.dispatchEvent(new Event('authChange'));

    // Navigate to landing page
    navigate('/', { replace: true });
  };

  const links = [
    {
      label: "Dashboard",
      href: "#",
      icon: <IconDashboard className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
      onClick: () => setActiveSection('dashboard')
    },
    {
      label: "Portfolio",
      href: "#",
      icon: <IconBriefcase className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
      onClick: () => setActiveSection('portfolio')
    },
    {
      label: "News",
      href: "#",
      icon: <IconNews className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
      onClick: () => setActiveSection('news')
    },
    {
      label: "AI Insights",
      href: "#",
      icon: <IconBrain className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />,
      onClick: () => setActiveSection('insights')
    },
  ];

  const Logo = () => {
    return (
      <div className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal">
        <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-blue-600" />
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-medium whitespace-pre text-neutral-700 dark:text-white"
        >
          Stock Sense
        </motion.span>
      </div>
    );
  };

  const LogoIcon = () => {
    return (
      <div className="relative z-20 flex items-center justify-center py-1 text-sm font-normal">
        <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">SS</span>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'portfolio':
        return (
          <PortfolioManager
            stocks={portfolioStocks}
            onStocksChange={setPortfolioStocks}
            addStock={addStockToPortfolio}
            removeStock={removeStockFromPortfolio}
            loading={portfolioLoading}
            error={portfolioError}
          />
        );
      case 'news':
        return (
          <NewsFeed
            portfolioStocks={portfolioStocks.map(stock => stock.symbol)}
            onNewsUpdate={setNews}
          />
        );
      case 'insights':
        return (
          <AIInsights
            insights={aiInsights}
            marketSentiment={marketSentiment}
            loading={aiLoading}
          />
        );
      default:
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold text-white mb-6">
              Welcome back, {user?.name || 'User'}!
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-3">Portfolio Overview</h3>
                <p className="text-slate-300 mb-4">Track your investments and performance</p>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-400 text-sm">{portfolioStocks.length} stocks</span>
                  <span className="text-green-400 text-sm">
                    {portfolioStocks.length > 0 ? 'Active' : 'Empty'}
                  </span>
                </div>
                <button
                  onClick={() => setActiveSection('portfolio')}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  View Portfolio
                </button>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-3">Market News</h3>
                <p className="text-slate-300 mb-4">Stay updated with latest market trends</p>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-400 text-sm">{news.length} articles</span>
                  <span className="text-blue-400 text-sm">Live</span>
                </div>
                <button
                  onClick={() => setActiveSection('news')}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Read News
                </button>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-3">AI Insights</h3>
                <p className="text-slate-300 mb-4">Get intelligent investment recommendations</p>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-400 text-sm">{aiInsights.length} insights</span>
                  <span className="text-purple-400 text-sm">
                    {aiLoading ? 'Analyzing...' : 'Ready'}
                  </span>
                </div>
                <button
                  onClick={() => setActiveSection('insights')}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  View Insights
                </button>
              </div>
            </div>

            {/* Quick Stats Section */}
            <div className="mt-8 bg-slate-800/30 rounded-xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">Quick Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{portfolioStocks.length}</div>
                  <div className="text-slate-400 text-sm">Portfolio Stocks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{news.length}</div>
                  <div className="text-slate-400 text-sm">News Articles</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{aiInsights.length}</div>
                  <div className="text-slate-400 text-sm">AI Insights</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    marketSentiment?.overall === 'bullish' ? 'text-green-400' :
                    marketSentiment?.overall === 'bearish' ? 'text-red-400' :
                    'text-amber-400'
                  }`}>
                    {marketSentiment?.overall || 'N/A'}
                  </div>
                  <div className="text-slate-400 text-sm">Market Sentiment</div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={cn(
      "mx-auto flex w-full max-w-full flex-1 flex-col overflow-hidden bg-slate-900 md:flex-row",
      "h-screen"
    )}>
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {sidebarOpen ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <div
                  key={idx}
                  onClick={link.onClick}
                  className="cursor-pointer"
                >
                  <SidebarLink link={link} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center space-x-2 p-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center shrink-0">
                <span className="text-white font-semibold text-sm">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              {sidebarOpen && (
                <div className="min-w-0 flex-1">
                  <p className="text-neutral-700 dark:text-white text-sm font-medium truncate">{user?.name || 'User'}</p>
                  <p className="text-neutral-500 dark:text-neutral-400 text-xs truncate">{user?.email}</p>
                </div>
              )}
            </div>
            <div
              onClick={handleLogout}
              className="cursor-pointer"
            >
              <SidebarLink
                link={{
                  label: "Logout",
                  href: "#",
                  icon: <IconLogout className="h-5 w-5 shrink-0 text-red-500" />,
                }}
              />
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main Content */}
      <div className="flex flex-1">
        <div className="flex h-full w-full flex-1 flex-col gap-2 rounded-tl-2xl border border-neutral-200 bg-slate-900 p-2 md:p-6 dark:border-neutral-700 dark:bg-slate-900">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
