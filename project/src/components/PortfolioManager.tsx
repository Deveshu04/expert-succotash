import React, { useState, useEffect } from 'react';
import { Stock } from '../types';
import { fetchStockData, searchIndianStocks, debugAlphaVantageAPI } from '../services/stockService';
import { Plus, X, TrendingUp, TrendingDown, Search, Bug } from 'lucide-react';

interface PortfolioManagerProps {
  stocks: Stock[];
  onStocksChange: (stocks: Stock[]) => void;
  addStock?: (stock: Stock) => void;
  removeStock?: (symbol: string) => void;
  loading?: boolean;
  error?: string | null;
}

const PortfolioManager: React.FC<PortfolioManagerProps> = ({
  stocks,
  onStocksChange,
  addStock: externalAddStock,
  removeStock: externalRemoveStock,
  loading: externalLoading,
  error: externalError
}) => {
  const [newStock, setNewStock] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Search for stock symbols as user types
  useEffect(() => {
    const searchStocks = async () => {
      if (newStock.length >= 2) {
        try {
          const results = await searchIndianStocks(newStock);
          setSearchResults(results);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
        setShowSuggestions(false);
      }
    };

    const timeoutId = setTimeout(searchStocks, 300);
    return () => clearTimeout(timeoutId);
  }, [newStock]);

  const addStock = async (symbol?: string) => {
    const stockSymbol = symbol || newStock.trim();
    if (!stockSymbol) return;
    
    setLoading(true);
    setError('');
    
    try {
      const stockData = await fetchStockData(stockSymbol);
      if (stockData) {
        const existingIndex = stocks.findIndex(s => s.symbol === stockData.symbol);
        if (existingIndex >= 0) {
          const updatedStocks = [...stocks];
          updatedStocks[existingIndex].quantity = (updatedStocks[existingIndex].quantity || 1) + parseInt(quantity);

          // Use external addStock function if provided (to save to backend)
          if (externalAddStock) {
            externalAddStock(updatedStocks[existingIndex]);
          } else {
            onStocksChange(updatedStocks);
          }
        } else {
          const newStockData = { ...stockData, quantity: parseInt(quantity) };

          // Use external addStock function if provided (to save to backend)
          if (externalAddStock) {
            externalAddStock(newStockData);
          } else {
            onStocksChange([...stocks, newStockData]);
          }
        }

        setNewStock('');
        setQuantity('1');
        setShowSuggestions(false);
      } else {
        setError('Stock symbol not found. Please try a valid Indian stock symbol.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stock data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const removeStock = (symbol: string) => {
    // Use external removeStock function if provided (to remove from backend)
    if (externalRemoveStock) {
      externalRemoveStock(symbol);
    } else {
      onStocksChange(stocks.filter(s => s.symbol !== symbol));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const totalValue = stocks.reduce((sum, stock) => sum + (stock.price * (stock.quantity || 1)), 0);
  const totalChange = stocks.reduce((sum, stock) => sum + (stock.change * (stock.quantity || 1)), 0);
  const totalChangePercent = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header with Debug Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Portfolio Manager</h2>
        <button
          onClick={() => debugAlphaVantageAPI()}
          className="px-3 py-1 text-xs bg-purple-100 text-purple-600 rounded hover:bg-purple-200 transition-colors flex items-center space-x-1"
          title="Debug Alpha Vantage API (check console)"
        >
          <Bug className="h-3 w-3" />
          <span>Debug Stock API</span>
        </button>
      </div>

      {/* Portfolio Summary */}
      {stocks.length > 0 && (
        <div className="bg-gradient-to-r from-slate-50 to-emerald-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalValue)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Today's Change</p>
              <div className="flex items-center space-x-1">
                {totalChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <p className={`text-lg font-bold ${totalChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(totalChange))} ({totalChangePercent.toFixed(2)}%)
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Holdings</p>
              <p className="text-lg font-bold text-gray-900">{stocks.length} stocks</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Form */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg relative">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Add Stock to Portfolio</h3>
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search Indian stocks (e.g., RELIANCE, TCS)"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && addStock()}
              onFocus={() => setShowSuggestions(searchResults.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            
            {/* Search Suggestions */}
            {showSuggestions && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {searchResults.map((symbol, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setNewStock(symbol);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            type="number"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            min="1"
          />
          <button
            onClick={() => addStock()}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            <Plus className="h-4 w-4" />
            <span>{loading ? 'Adding...' : 'Add'}</span>
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <p className="text-xs text-gray-500 mt-2">
          Search for Indian stocks by symbol or company name. Data powered by Alpha Vantage.
        </p>
      </div>

      {/* Stock List */}
      <div className="space-y-3">
        {stocks.map((stock) => (
          <div key={stock.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{stock.symbol}</p>
                  <p className="text-sm text-gray-600">{stock.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(stock.price || 0)}</p>
                  <div className="flex items-center justify-end space-x-1">
                    {(stock.change || 0) >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <p className={`text-sm ${(stock.change || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {(stock.change || 0) >= 0 ? '+' : ''}{(stock.change || 0).toFixed(2)} ({(stock.changePercent || 0).toFixed(2)}%)
                    </p>
                  </div>
                </div>
              </div>
              {stock.quantity && stock.quantity > 1 && (
                <p className="text-xs text-gray-500 mt-1">
                  Quantity: {stock.quantity} | Value: {formatCurrency(stock.price * stock.quantity)}
                </p>
              )}
            </div>
            <button
              onClick={() => removeStock(stock.symbol)}
              className="ml-3 p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {stocks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No stocks in portfolio</p>
          <p className="text-sm">Add some stocks to get personalized news and insights</p>
        </div>
      )}
    </div>
  );
};

export default PortfolioManager;
