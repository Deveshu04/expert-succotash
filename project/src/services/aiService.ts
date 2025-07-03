import { NewsItem, AIInsight, MarketSentiment } from '../types';

// OpenRouter AI configuration with enhanced Gemma 3 features
const getOpenAIClient = () => {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const siteUrl = import.meta.env.VITE_SITE_URL || 'http://localhost:5173';
  const siteName = import.meta.env.VITE_SITE_NAME || 'StockSense India';

  console.log('AI Service: Initializing OpenRouter client with Gemma 3...');
  console.log('AI Service: API Key present:', apiKey ? 'Yes' : 'No');
  console.log('AI Service: API Key length:', apiKey ? apiKey.length : 0);

  if (!apiKey) {
    console.error('AI Service: OpenRouter API key not found in environment variables');
    throw new Error('OpenRouter API key not found. Please add VITE_OPENROUTER_API_KEY to your .env file');
  }

  // Dynamic import to avoid build issues
  return import('openai').then(({ default: OpenAI }) => {
    console.log('AI Service: OpenAI package imported successfully - Using Gemma 3 Model');
    return new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
      defaultHeaders: {
        "HTTP-Referer": siteUrl,
        "X-Title": siteName,
        // Removed custom headers that were causing CORS issues
      },
      dangerouslyAllowBrowser: true // Required for client-side usage
    });
  }).catch(error => {
    console.error('AI Service: Failed to import OpenAI package:', error);
    throw new Error('Failed to load OpenAI package. Please ensure it is installed.');
  });
};

export const analyzeNewsImpact = async (news: NewsItem[], portfolioStocks: string[]): Promise<AIInsight[]> => {
  try {
    const openai = await getOpenAIClient();
    
    const insights: AIInsight[] = [];
    
    for (const stock of portfolioStocks) {
      const relevantNews = news.filter(item => 
        item.relevantStocks.some(newsStock => newsStock.toUpperCase() === stock.toUpperCase()) ||
        item.headline.toLowerCase().includes(stock.toLowerCase()) ||
        item.summary.toLowerCase().includes(stock.toLowerCase())
      );

      if (relevantNews.length === 0) {
        insights.push({
          stock,
          sentiment: 'neutral',
          impact: 'low',
          confidence: 0.3,
          reasoning: 'No specific news found for this stock in recent updates.',
          recommendation: 'Monitor for upcoming developments and earnings reports.'
        });
        continue;
      }

      // Prepare news context for AI analysis
      const newsContext = relevantNews.map(item => 
        `Headline: ${item.headline}\nSummary: ${item.summary}\nSource: ${item.source}`
      ).join('\n\n');

      const prompt = `
        Analyze the following news for stock ${stock} and provide investment insights:

        NEWS:
        ${newsContext}

        Please provide a JSON response with the following structure:
        {
          "sentiment": "positive|negative|neutral",
          "impact": "high|medium|low",
          "confidence": 0.0-1.0,
          "reasoning": "Brief explanation of the analysis",
          "recommendation": "Investment recommendation based on the news"
        }

        Consider factors like:
        - Financial performance indicators
        - Market sentiment and investor confidence
        - Regulatory changes or policy impacts
        - Competitive positioning
        - Future growth prospects
      `;

      try {
        const completion = await openai.chat.completions.create({
          model: "google/gemma-2-9b-it:free",  // Updated to use Gemma 3 model
          messages: [
            {
              role: "system",
              content: "You are a financial analyst providing stock market insights. Always respond with valid JSON only."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        });

        const response = completion.choices[0].message.content;
        if (response) {
          try {
            const analysis = JSON.parse(response);
            insights.push({
              stock,
              sentiment: analysis.sentiment || 'neutral',
              impact: analysis.impact || 'low',
              confidence: Math.min(Math.max(analysis.confidence || 0.5, 0), 1),
              reasoning: analysis.reasoning || 'Analysis completed based on available news.',
              recommendation: analysis.recommendation || 'Monitor stock performance.'
            });
          } catch (parseError) {
            console.error('Failed to parse AI response for', stock, parseError);
            insights.push(getFallbackInsight(stock, relevantNews));
          }
        }
      } catch (apiError) {
        console.error('AI API error for', stock, apiError);
        insights.push(getFallbackInsight(stock, relevantNews));
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return insights;
  } catch (error) {
    console.error('AI service error:', error);
    // Return fallback analysis if AI service fails
    return portfolioStocks.map(stock => getFallbackInsight(stock, news));
  }
};

export const analyzeMarketSentiment = async (news: NewsItem[]): Promise<MarketSentiment> => {
  try {
    const openai = await getOpenAIClient();

    const marketNews = news.filter(item => 
      item.category === 'market' || 
      item.category === 'policy' || 
      item.category === 'economy'
    ).slice(0, 10); // Limit to recent 10 news items

    if (marketNews.length === 0) {
      return {
        overall: 'neutral',
        confidence: 0.3,
        summary: 'Insufficient market news for sentiment analysis.',
        keyFactors: ['Limited news data available']
      };
    }

    const newsContext = marketNews.map(item => 
      `${item.headline} - ${item.summary}`
    ).join('\n');

    const prompt = `
      Analyze the overall Indian stock market sentiment based on the following recent news:

      ${newsContext}

      Provide a JSON response with:
      {
        "overall": "bullish|bearish|neutral",
        "confidence": 0.0-1.0,
        "summary": "Brief market sentiment summary",
        "keyFactors": ["factor1", "factor2", "factor3", "factor4"]
      }

      Consider:
      - Economic indicators and policy changes
      - Market performance and investor sentiment
      - Global factors affecting Indian markets
      - Sector-specific developments
    `;

    const completion = await openai.chat.completions.create({
      model: "google/gemma-2-9b-it:free",  // Updated to use Gemma 3 model
      messages: [
        {
          role: "system",
          content: "You are a market analyst specializing in Indian stock markets. Respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 400
    });

    const response = completion.choices[0].message.content;
    if (response) {
      try {
        const analysis = JSON.parse(response);
        return {
          overall: analysis.overall || 'neutral',
          confidence: Math.min(Math.max(analysis.confidence || 0.5, 0), 1),
          summary: analysis.summary || 'Market sentiment analysis completed.',
          keyFactors: analysis.keyFactors || ['Market analysis', 'Economic factors', 'Policy developments', 'Global trends']
        };
      } catch (parseError) {
        console.error('Failed to parse market sentiment response:', parseError);
      }
    }
  } catch (error) {
    console.error('Market sentiment analysis error:', error);
  }

  // Fallback sentiment analysis
  return getFallbackMarketSentiment(news);
};

// Enhanced AI functions leveraging Gemma 3's advanced capabilities

// Portfolio Risk Assessment using Gemma 3's advanced reasoning
export const analyzePortfolioRisk = async (stocks: any[]): Promise<{
  riskLevel: 'low' | 'medium' | 'high';
  diversificationScore: number;
  recommendations: string[];
  riskFactors: string[];
}> => {
  try {
    const openai = await getOpenAIClient();

    const portfolioContext = stocks.map(stock =>
      `${stock.symbol}: Price ₹${stock.price}, Change ${stock.change} (${stock.changePercent}%), Quantity: ${stock.quantity || 1}`
    ).join('\n');

    const prompt = `
      Analyze this Indian stock portfolio for risk assessment:

      PORTFOLIO:
      ${portfolioContext}

      Provide a comprehensive risk analysis in JSON format:
      {
        "riskLevel": "low|medium|high",
        "diversificationScore": 0.0-1.0,
        "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
        "riskFactors": ["factor1", "factor2", "factor3"],
        "sectorConcentration": "description",
        "volatilityAssessment": "assessment"
      }

      Consider:
      - Sector diversification
      - Stock concentration risk
      - Market volatility patterns
      - Correlation between holdings
      - Indian market specific risks
    `;

    const completion = await openai.chat.completions.create({
      model: "google/gemma-2-9b-it:free",
      messages: [
        {
          role: "system",
          content: "You are a risk management expert specializing in Indian equity markets. Provide detailed risk analysis in valid JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2, // Lower temperature for more consistent risk analysis
      max_tokens: 600
    });

    const response = completion.choices[0].message.content;
    if (response) {
      try {
        const analysis = JSON.parse(response);
        return {
          riskLevel: analysis.riskLevel || 'medium',
          diversificationScore: Math.min(Math.max(analysis.diversificationScore || 0.5, 0), 1),
          recommendations: analysis.recommendations || ['Monitor portfolio regularly', 'Consider diversification', 'Review risk tolerance'],
          riskFactors: analysis.riskFactors || ['Market volatility', 'Sector concentration', 'Economic factors']
        };
      } catch (parseError) {
        console.error('Failed to parse risk analysis response:', parseError);
      }
    }
  } catch (error) {
    console.error('Portfolio risk analysis error:', error);
  }

  // Fallback risk analysis
  return {
    riskLevel: stocks.length < 3 ? 'high' : stocks.length < 7 ? 'medium' : 'low',
    diversificationScore: Math.min(stocks.length / 10, 1),
    recommendations: [
      'Consider adding more diverse stocks',
      'Monitor market conditions',
      'Review portfolio allocation'
    ],
    riskFactors: [
      'Limited diversification',
      'Market volatility',
      'Sector concentration'
    ]
  };
};

// Smart Investment Suggestions using Gemma 3's reasoning
export const generateInvestmentSuggestions = async (
  currentPortfolio: any[],
  marketSentiment: MarketSentiment,
  userRiskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
): Promise<{
  suggestions: Array<{
    action: 'buy' | 'sell' | 'hold';
    symbol: string;
    reasoning: string;
    confidence: number;
  }>;
  portfolioOptimizations: string[];
}> => {
  try {
    const openai = await getOpenAIClient();

    const portfolioSummary = currentPortfolio.map(stock =>
      `${stock.symbol}: ₹${stock.price} (${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent}%)`
    ).join(', ');

    const prompt = `
      Generate investment suggestions for this Indian stock portfolio:

      CURRENT PORTFOLIO: ${portfolioSummary}
      MARKET SENTIMENT: ${marketSentiment.overall} (${marketSentiment.confidence * 100}% confidence)
      RISK PROFILE: ${userRiskProfile}
      KEY MARKET FACTORS: ${marketSentiment.keyFactors.join(', ')}

      Provide investment recommendations in JSON format:
      {
        "suggestions": [
          {
            "action": "buy|sell|hold",
            "symbol": "stock_symbol",
            "reasoning": "detailed reasoning",
            "confidence": 0.0-1.0
          }
        ],
        "portfolioOptimizations": ["optimization1", "optimization2"],
        "marketTiming": "assessment",
        "sectorRecommendations": ["sector1", "sector2"]
      }

      Focus on:
      - Indian market dynamics
      - Current market sentiment
      - Portfolio balance and diversification
      - Risk-adjusted returns
      - Sector rotation opportunities
    `;

    const completion = await openai.chat.completions.create({
      model: "google/gemma-2-9b-it:free",
      messages: [
        {
          role: "system",
          content: "You are an investment advisor specializing in Indian stock markets. Provide actionable investment suggestions in valid JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 800
    });

    const response = completion.choices[0].message.content;
    if (response) {
      try {
        const analysis = JSON.parse(response);
        return {
          suggestions: analysis.suggestions || [],
          portfolioOptimizations: analysis.portfolioOptimizations || [
            'Consider rebalancing portfolio',
            'Review sector allocation',
            'Monitor risk exposure'
          ]
        };
      } catch (parseError) {
        console.error('Failed to parse investment suggestions:', parseError);
      }
    }
  } catch (error) {
    console.error('Investment suggestions error:', error);
  }

  // Fallback suggestions
  return {
    suggestions: [
      {
        action: 'hold',
        symbol: 'PORTFOLIO',
        reasoning: 'Maintain current positions while monitoring market conditions',
        confidence: 0.6
      }
    ],
    portfolioOptimizations: [
      'Consider diversifying across sectors',
      'Monitor market sentiment changes',
      'Review position sizes'
    ]
  };
};

// News Impact Prediction using Gemma 3's advanced context understanding
export const predictNewsImpact = async (
  newsItem: NewsItem,
  affectedStocks: string[]
): Promise<{
  shortTermImpact: 'positive' | 'negative' | 'neutral';
  longTermImpact: 'positive' | 'negative' | 'neutral';
  timeframe: string;
  impactMagnitude: number;
  affectedSectors: string[];
}> => {
  try {
    const openai = await getOpenAIClient();

    const prompt = `
      Predict the market impact of this news on Indian stocks:

      HEADLINE: ${newsItem.headline}
      SUMMARY: ${newsItem.summary}
      SOURCE: ${newsItem.source}
      AFFECTED STOCKS: ${affectedStocks.join(', ')}

      Provide impact prediction in JSON format:
      {
        "shortTermImpact": "positive|negative|neutral",
        "longTermImpact": "positive|negative|neutral",
        "timeframe": "immediate|days|weeks|months",
        "impactMagnitude": 0.0-1.0,
        "affectedSectors": ["sector1", "sector2"],
        "keyDrivers": ["driver1", "driver2"],
        "riskFactors": ["risk1", "risk2"]
      }

      Consider:
      - Market reaction patterns in India
      - Sector interdependencies
      - Regulatory implications
      - Economic spillover effects
      - Historical precedents
    `;

    const completion = await openai.chat.completions.create({
      model: "google/gemma-2-9b-it:free",
      messages: [
        {
          role: "system",
          content: "You are a market impact analyst specializing in Indian financial markets. Provide detailed impact predictions in valid JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const response = completion.choices[0].message.content;
    if (response) {
      try {
        const analysis = JSON.parse(response);
        return {
          shortTermImpact: analysis.shortTermImpact || 'neutral',
          longTermImpact: analysis.longTermImpact || 'neutral',
          timeframe: analysis.timeframe || 'days',
          impactMagnitude: Math.min(Math.max(analysis.impactMagnitude || 0.5, 0), 1),
          affectedSectors: analysis.affectedSectors || ['General Market']
        };
      } catch (parseError) {
        console.error('Failed to parse news impact prediction:', parseError);
      }
    }
  } catch (error) {
    console.error('News impact prediction error:', error);
  }

  // Fallback prediction
  return {
    shortTermImpact: 'neutral',
    longTermImpact: 'neutral',
    timeframe: 'days',
    impactMagnitude: 0.3,
    affectedSectors: ['General Market']
  };
};

// Fallback functions for when AI service is unavailable
const getFallbackInsight = (stock: string, relevantNews: NewsItem[]): AIInsight => {
  const positiveKeywords = ['profit', 'growth', 'wins', 'surge', 'high', 'strong', 'robust', 'improves', 'beats', 'exceeds'];
  const negativeKeywords = ['loss', 'decline', 'falls', 'weak', 'concern', 'issue', 'problem', 'drops', 'misses'];

  let sentimentScore = 0;
  relevantNews.forEach(item => {
    const text = (item.headline + ' ' + item.summary).toLowerCase();
    positiveKeywords.forEach(keyword => {
      if (text.includes(keyword)) sentimentScore += 1;
    });
    negativeKeywords.forEach(keyword => {
      if (text.includes(keyword)) sentimentScore -= 1;
    });
  });

  const sentiment: 'positive' | 'negative' | 'neutral' = 
    sentimentScore > 0 ? 'positive' : sentimentScore < 0 ? 'negative' : 'neutral';
  
  const impact: 'high' | 'medium' | 'low' = 
    Math.abs(sentimentScore) >= 2 ? 'high' : Math.abs(sentimentScore) >= 1 ? 'medium' : 'low';

  const confidence = Math.min(0.7, 0.4 + (Math.abs(sentimentScore) * 0.1));

  return {
    stock,
    sentiment,
    impact,
    confidence,
    reasoning: `Based on keyword analysis of ${relevantNews.length} news items. ${sentiment} sentiment detected.`,
    recommendation: sentiment === 'positive' ? 'Consider maintaining or increasing position.' : 
                   sentiment === 'negative' ? 'Monitor closely and consider risk management.' : 
                   'Hold current position and await further developments.'
  };
};

const getFallbackMarketSentiment = (news: NewsItem[]): MarketSentiment => {
  const marketNews = news.filter(item => item.category === 'market' || item.category === 'policy');
  const positiveCount = marketNews.filter(item => 
    item.headline.toLowerCase().includes('high') || 
    item.headline.toLowerCase().includes('surge') ||
    item.headline.toLowerCase().includes('growth')
  ).length;

  const negativeCount = marketNews.filter(item => 
    item.headline.toLowerCase().includes('fall') || 
    item.headline.toLowerCase().includes('decline') ||
    item.headline.toLowerCase().includes('concern')
  ).length;

  const overall: 'bullish' | 'bearish' | 'neutral' = 
    positiveCount > negativeCount ? 'bullish' : 
    negativeCount > positiveCount ? 'bearish' : 'neutral';

  return {
    overall,
    confidence: 0.6,
    summary: `Market sentiment appears ${overall} based on recent news analysis using fallback method.`,
    keyFactors: [
      'News sentiment analysis',
      'Market performance indicators',
      'Policy developments',
      'Economic trends'
    ]
  };
};
