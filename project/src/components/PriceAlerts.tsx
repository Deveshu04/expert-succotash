import React, { useState, useEffect } from 'react';
import { PriceAlert, Stock, NotificationSettings } from '../types';
import { Bell, BellOff, Plus, X, TrendingUp, TrendingDown, Settings, Trash2 } from 'lucide-react';

interface PriceAlertsProps {
  stocks: Stock[];
  alerts: PriceAlert[];
  onAlertAdd: (alert: Omit<PriceAlert, 'id' | 'createdAt'>) => void;
  onAlertRemove: (alertId: string) => void;
  onAlertToggle: (alertId: string) => void;
  notificationSettings: NotificationSettings;
  onNotificationSettingsChange: (settings: NotificationSettings) => void;
}

const PriceAlerts: React.FC<PriceAlertsProps> = ({
  stocks,
  alerts,
  onAlertAdd,
  onAlertRemove,
  onAlertToggle,
  notificationSettings,
  onNotificationSettingsChange
}) => {
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newAlert, setNewAlert] = useState({
    symbol: '',
    type: 'above' as 'above' | 'below',
    targetPrice: ''
  });

  // Check for triggered alerts
  useEffect(() => {
    const checkAlerts = () => {
      alerts.forEach(alert => {
        if (!alert.isActive || alert.triggeredAt) return;

        const stock = stocks.find(s => s.symbol === alert.symbol);
        if (!stock) return;

        const shouldTrigger =
          (alert.type === 'above' && stock.price >= alert.targetPrice) ||
          (alert.type === 'below' && stock.price <= alert.targetPrice);

        if (shouldTrigger) {
          // Trigger notification
          if (notificationSettings.pushNotifications && 'Notification' in window) {
            new Notification(`Price Alert: ${alert.symbol}`, {
              body: `${alert.symbol} has reached ₹${stock.price.toFixed(2)} (Target: ${alert.type} ₹${alert.targetPrice})`,
              icon: '/favicon.ico'
            });
          }

          // Update alert as triggered
          onAlertToggle(alert.id);
        }
      });
    };

    const interval = setInterval(checkAlerts, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [alerts, stocks, notificationSettings, onAlertToggle]);

  // Request notification permission
  useEffect(() => {
    if (notificationSettings.pushNotifications && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [notificationSettings.pushNotifications]);

  const handleAddAlert = () => {
    if (!newAlert.symbol || !newAlert.targetPrice) return;

    const stock = stocks.find(s => s.symbol === newAlert.symbol);
    if (!stock) return;

    onAlertAdd({
      symbol: newAlert.symbol,
      type: newAlert.type,
      targetPrice: parseFloat(newAlert.targetPrice),
      currentPrice: stock.price,
      isActive: true
    });

    setNewAlert({ symbol: '', type: 'above', targetPrice: '' });
    setShowAddAlert(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const activeAlerts = alerts.filter(alert => alert.isActive && !alert.triggeredAt);
  const triggeredAlerts = alerts.filter(alert => alert.triggeredAt);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Bell className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-bold text-gray-900">Price Alerts</h2>
          {activeAlerts.length > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
              {activeAlerts.length} active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Notification Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowAddAlert(!showAddAlert)}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-1"
          >
            <Plus className="h-4 w-4" />
            <span>Add Alert</span>
          </button>
        </div>
      </div>

      {/* Notification Settings */}
      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Notification Settings</h3>
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={notificationSettings.pushNotifications}
                onChange={(e) => onNotificationSettingsChange({
                  ...notificationSettings,
                  pushNotifications: e.target.checked
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Push Notifications</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={notificationSettings.priceAlerts}
                onChange={(e) => onNotificationSettingsChange({
                  ...notificationSettings,
                  priceAlerts: e.target.checked
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Price Alert Notifications</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={notificationSettings.newsAlerts}
                onChange={(e) => onNotificationSettingsChange({
                  ...notificationSettings,
                  newsAlerts: e.target.checked
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">News Alert Notifications</span>
            </label>
          </div>
        </div>
      )}

      {/* Add Alert Form */}
      {showAddAlert && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Create Price Alert</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={newAlert.symbol}
              onChange={(e) => setNewAlert({ ...newAlert, symbol: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Stock</option>
              {stocks.map(stock => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol} - {formatCurrency(stock.price)}
                </option>
              ))}
            </select>
            <select
              value={newAlert.type}
              onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value as 'above' | 'below' })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
            <input
              type="number"
              placeholder="Target Price"
              value={newAlert.targetPrice}
              onChange={(e) => setNewAlert({ ...newAlert, targetPrice: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.01"
              min="0"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleAddAlert}
                disabled={!newAlert.symbol || !newAlert.targetPrice}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
              <button
                onClick={() => setShowAddAlert(false)}
                className="px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Active Alerts</h3>
          <div className="space-y-2">
            {activeAlerts.map(alert => {
              const stock = stocks.find(s => s.symbol === alert.symbol);
              return (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {alert.type === 'above' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {alert.symbol} {alert.type} {formatCurrency(alert.targetPrice)}
                      </p>
                      {stock && (
                        <p className="text-sm text-gray-600">
                          Current: {formatCurrency(stock.price)} |
                          {alert.type === 'above'
                            ? ` Need: +${formatCurrency(alert.targetPrice - stock.price)}`
                            : ` Need: -${formatCurrency(stock.price - alert.targetPrice)}`
                          }
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onAlertToggle(alert.id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Deactivate Alert"
                    >
                      <BellOff className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onAlertRemove(alert.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                      title="Delete Alert"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Triggered Alerts */}
      {triggeredAlerts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Recently Triggered</h3>
          <div className="space-y-2">
            {triggeredAlerts.slice(0, 5).map(alert => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Bell className="h-4 w-4 text-yellow-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {alert.symbol} reached {formatCurrency(alert.targetPrice)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Triggered: {new Date(alert.triggeredAt!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onAlertRemove(alert.id)}
                  className="p-1 text-gray-400 hover:text-red-500"
                  title="Delete Alert"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {alerts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p>No price alerts set</p>
          <p className="text-sm">Create alerts to get notified when stocks reach your target prices</p>
        </div>
      )}
    </div>
  );
};

export default PriceAlerts;
