import React from 'react';
import { NewsItem } from '../types';
import { Clock, ExternalLink, Tag } from 'lucide-react';

interface NewsCardProps {
  news: NewsItem;
  isFiltered?: boolean;
}

const NewsCard: React.FC<NewsCardProps> = ({ news, isFiltered = false }) => {
  const formatTime = (timestamp: string) => {
    const now = new Date();
    const newsTime = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - newsTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'company': return 'bg-blue-100 text-blue-800';
      case 'market': return 'bg-green-100 text-green-800';
      case 'policy': return 'bg-purple-100 text-purple-800';
      case 'economy': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 ${isFiltered ? 'border-l-4 border-emerald-500' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(news.category)}`}>
            {news.category.charAt(0).toUpperCase() + news.category.slice(1)}
          </span>
          {isFiltered && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              Portfolio Match
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          <span>{formatTime(news.timestamp)}</span>
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-emerald-600 cursor-pointer transition-colors">
        {news.headline}
      </h3>
      
      <p className="text-gray-600 text-sm mb-3 line-clamp-3">
        {news.summary}
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Source:</span>
          <span className="text-xs font-medium text-gray-700">{news.source}</span>
        </div>
        
        {news.relevantStocks.length > 0 && (
          <div className="flex items-center space-x-1">
            <Tag className="h-3 w-3 text-gray-400" />
            <div className="flex space-x-1">
              {news.relevantStocks.slice(0, 3).map((stock, index) => (
                <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  {stock}
                </span>
              ))}
              {news.relevantStocks.length > 3 && (
                <span className="text-xs text-gray-500">+{news.relevantStocks.length - 3}</span>
              )}
            </div>
          </div>
        )}
      </div>
      
      <a
        href={news.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center space-x-1 text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
      >
        <span>Read full article</span>
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
};

export default NewsCard;