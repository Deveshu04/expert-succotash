import React from 'react';
import { AIInsight, MarketSentiment } from '../types';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Target, Bug } from 'lucide-react';

interface AIInsightsProps {
  insights: AIInsight[];
  marketSentiment: MarketSentiment | null;
  loading: boolean;
  onDebugAI?: () => void;
}

const AIInsights: React.FC<AIInsightsProps> = ({ insights, marketSentiment, loading, onDebugAI }) => {
  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="h-5 w-5 text-emerald-500" />;
      case 'negative': return <TrendingDown className="h-5 w-5 text-red-500" />;
      default: return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'negative': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getImpactBadge = (impact: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[impact as keyof typeof colors] || colors.low;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Brain className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-bold text-gray-900">AI Insights</h2>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-bold text-gray-900">AI Market Intelligence</h2>
        </div>
        {onDebugAI && (
          <button
            onClick={onDebugAI}
            className="px-3 py-1 text-xs bg-purple-100 text-purple-600 rounded hover:bg-purple-200 transition-colors flex items-center space-x-1"
            title="Debug AI Analysis (check console)"
          >
            <Bug className="h-3 w-3" />
            <span>Debug AI</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {/* Market Sentiment */}
        {marketSentiment && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Overall Market Sentiment</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                marketSentiment.overall === 'bullish' ? 'bg-emerald-100 text-emerald-800' :
                marketSentiment.overall === 'bearish' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {marketSentiment.overall.charAt(0).toUpperCase() + marketSentiment.overall.slice(1)}
              </span>
            </div>
            <p className="text-gray-700 mb-3">{marketSentiment.summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">Key Factors:</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {marketSentiment.keyFactors.map((factor, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-gray-600">
                  Confidence: {Math.round(marketSentiment.confidence * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Insights */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Portfolio Stock Analysis</h3>

          {insights.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p>Add stocks to your portfolio to get AI-powered insights</p>
            </div>
          ) : (
            insights.map((insight) => (
              <div key={insight.stock} className={`border rounded-lg p-4 ${getSentimentColor(insight.sentiment)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getSentimentIcon(insight.sentiment)}
                    <h4 className="font-semibold text-gray-900">{insight.stock}</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getImpactBadge(insight.impact)}`}>
                      {insight.impact.toUpperCase()} IMPACT
                    </span>
                    <span className="text-xs text-gray-600">
                      {Math.round(insight.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-3">
                  <strong>Analysis:</strong> {insight.reasoning}
                </p>

                <div className="bg-white bg-opacity-50 rounded p-3">
                  <p className="text-sm font-medium text-gray-900 mb-1">Recommendation:</p>
                  <p className="text-sm text-gray-700">{insight.recommendation}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {insights.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Disclaimer:</strong> AI analysis is based on recent news sentiment and should not be considered as investment advice.
              Please conduct your own research and consult with financial advisors before making investment decisions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsights;