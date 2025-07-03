import React, { useEffect, useState } from 'react';
import { TrendingUp, Bell, Settings } from 'lucide-react';

const fetchIndexData = async (symbol: string) => {
  // Example using Yahoo Finance API via RapidAPI or similar
  // Replace with your preferred API and add error handling as needed
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.BO?interval=1m&range=1d`);
    const data = await response.json();
    const result = data.chart.result[0];
    const lastClose = result.meta.regularMarketPrice;
    const prevClose = result.meta.chartPreviousClose;
    const change = lastClose - prevClose;
    const changePercent = (change / prevClose) * 100;
    return {
      value: lastClose,
      change,
      changePercent
    };
  } catch (error) {
    return null;
  }
};

const Header: React.FC = () => {
  const [nifty, setNifty] = useState<{ value: number; change: number; changePercent: number } | null>(null);
  const [sensex, setSensex] = useState<{ value: number; change: number; changePercent: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const niftyData = await fetchIndexData('^NSEI');
      const sensexData = await fetchIndexData('^BSESN');
      setNifty(niftyData);
      setSensex(sensexData);
    };
    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-emerald-500" />
            <div>
              <h1 className="text-xl font-bold">StockSense India</h1>
              <p className="text-xs text-slate-400">Smart Market Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium">Nifty 50</p>
              <p className={`text-xs ${nifty ? (nifty.change >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-gray-400'}`}>
                {nifty ? `${nifty.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${nifty.change >= 0 ? '+' : ''}${nifty.change.toFixed(2)} ${nifty.changePercent >= 0 ? '+' : ''}${nifty.changePercent.toFixed(2)}%)` : 'Loading...'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Sensex</p>
              <p className={`text-xs ${sensex ? (sensex.change >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-gray-400'}`}>
                {sensex ? `${sensex.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (${sensex.change >= 0 ? '+' : ''}${sensex.change.toFixed(2)} ${sensex.changePercent >= 0 ? '+' : ''}${sensex.changePercent.toFixed(2)}%)` : 'Loading...'}
              </p>
            </div>
            <div className="flex space-x-2">
              <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                <Bell className="h-5 w-5" />
              </button>
              <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;