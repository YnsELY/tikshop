import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, endOfDay, isToday } from 'date-fns';

interface SalesChartProps {
  data: Array<{
    date: string;
    sales: number;
    orders: number;
    revenue: number;
  }>;
  showMetricSelector?: boolean;
}

type MetricType = 'orders' | 'sales' | 'revenue';
type TimeRange = '1d' | '7d' | '30d';

const metricConfig = {
  orders: {
    label: 'Commandes',
    color: '#3b82f6',
    unit: '',
  },
  sales: {
    label: 'Articles vendus',
    color: '#10b981',
    unit: '',
  },
  revenue: {
    label: 'Revenus',
    color: '#f59e0b',
    unit: '€',
  },
};

const timeRangeConfig = {
  '1d': { label: '24 heures', days: 1 },
  '7d': { label: '7 jours', days: 7 },
  '30d': { label: '30 jours', days: 30 },
};

export const SalesChart: React.FC<SalesChartProps> = ({ data, showMetricSelector = true }) => {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('orders');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('30d');

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (selectedTimeRange === '1d') {
        return format(date, 'HH:mm');
      } else if (selectedTimeRange === '7d') {
        return format(date, 'dd/MM');
      } else {
        return format(date, 'dd/MM');
      }
    } catch {
      return dateStr;
    }
  };

  const formatValue = (value: number) => {
    const config = metricConfig[selectedMetric];
    if (config.unit === '€') {
      return `€${value.toFixed(0)}`;
    }
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const metric = showMetricSelector ? selectedMetric : 'orders';
      const config = metricConfig[metric];
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">
            {selectedTimeRange === '1d' 
              ? `${label}`
              : format(new Date(label), 'dd MMMM yyyy')
            }
          </p>
          <p className="text-sm" style={{ color: config.color }}>
            {config.label}: {formatValue(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Filtrer les données selon la période sélectionnée
  const filteredData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (selectedTimeRange === '1d') {
      // Pour 24h, ne prendre que les données d'aujourd'hui
      const today = new Date();
      return sortedData.filter(item => {
        const itemDate = new Date(item.date);
        return isToday(itemDate);
      });
    } else {
      // Pour 7j et 30j, prendre les X derniers jours
      const days = timeRangeConfig[selectedTimeRange].days;
      if (days >= sortedData.length) {
        return sortedData;
      } else {
        return sortedData.slice(-days);
      }
    }
  }, [data, selectedTimeRange]);

  if (!data || data.length === 0) {
    return (
      <div className="space-y-4">
        {/* Sélecteurs */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          {showMetricSelector && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Métrique
                </label>
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b6b5a] focus:border-transparent transition-colors text-sm"
                >
                  {Object.entries(metricConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Période
              </label>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value as TimeRange)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b6b5a] focus:border-transparent transition-colors text-sm"
              >
                {Object.entries(timeRangeConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Message d'absence de données */}
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>Aucune donnée disponible pour cette période</p>
        </div>
      </div>
    );
  }

  const currentMetric = showMetricSelector ? selectedMetric : 'orders';
  const currentConfig = metricConfig[currentMetric];

  return (
    <div className="space-y-4">
      {/* Sélecteurs */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between">
        {showMetricSelector && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Métrique
              </label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b6b5a] focus:border-transparent transition-colors text-sm"
              >
                {Object.entries(metricConfig).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Période
            </label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as TimeRange)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b6b5a] focus:border-transparent transition-colors text-sm"
            >
              {Object.entries(timeRangeConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Indicateur de la métrique sélectionnée */}
        {showMetricSelector && (
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: currentConfig.color }}
            ></div>
            <span className="text-sm font-medium text-gray-700">
              {currentConfig.label}
            </span>
          </div>
        )}
      </div>

      {/* Graphique */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={formatValue}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={currentMetric}
              stroke={currentConfig.color}
              strokeWidth={3}
              dot={{ fill: currentConfig.color, strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7, stroke: currentConfig.color, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="flex flex-col justify-center h-full">
            <p className="text-sm text-gray-600 mb-1">Total</p>
            <p className="text-lg font-semibold" style={{ color: currentConfig.color }}>
              {formatValue(filteredData.reduce((sum, item) => sum + item[currentMetric], 0))}
            </p>
          </div>
        </div>
        <div className="text-center">
          <div className="flex flex-col justify-center h-full">
            <p className="text-sm text-gray-600 mb-1">Moyenne</p>
            <p className="text-lg font-semibold" style={{ color: currentConfig.color }}>
              {formatValue(filteredData.length > 0 
                ? filteredData.reduce((sum, item) => sum + item[currentMetric], 0) / filteredData.length 
                : 0
              )}
            </p>
          </div>
        </div>
        <div className="text-center">
          <div className="flex flex-col justify-center h-full">
            <p className="text-sm text-gray-600 mb-1">Maximum</p>
            <p className="text-lg font-semibold" style={{ color: currentConfig.color }}>
              {formatValue(filteredData.length > 0 ? Math.max(...filteredData.map(item => item[currentMetric])) : 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Message informatif pour la période 24h */}
      {selectedTimeRange === '1d' && (
        <div className="text-center pt-2 border-t">
          <p className="text-sm text-gray-600">
            📅 Données d'aujourd'hui uniquement ({format(new Date(), 'dd/MM/yyyy')})
          </p>
        </div>
      )}
    </div>
  );
};