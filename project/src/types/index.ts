export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  timestamp: string;
  url: string;
  relevantStocks: string[];
  category: 'market' | 'company' | 'policy' | 'economy';
  isRecent?: boolean; // Flag to identify articles from last 24 hours
}

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  quantity?: number;
}

export interface Portfolio {
  stocks: Stock[];
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
}

export interface AIInsight {
  stock: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  reasoning: string;
  recommendation: string;
}

export interface MarketSentiment {
  overall: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  summary: string;
  keyFactors: string[];
}

export interface PriceAlert {
  id: string;
  symbol: string;
  type: 'above' | 'below';
  targetPrice: number;
  currentPrice: number;
  isActive: boolean;
  createdAt: string;
  triggeredAt?: string;
}

export interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  priceAlerts: boolean;
  newsAlerts: boolean;
}
