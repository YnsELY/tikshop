import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useAuthStore } from '../../store/authStore';
import { format, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HourlySalesData {
  hour: number;
  sales: number;
  orders: number;
}

export const HourlySalesChart: React.FC = () => {
  const { user } = useAuthStore();
  const { getSalesByHour } = useAnalytics();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [hourlyData, setHourlyData] = useState<HourlySalesData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHourlyData = async (date: string) => {
    if (!user?.profile?.is_admin) return;

    setIsLoading(true);
    setError(null);

    try {
      const selectedDateObj = new Date(date);
      const startDate = startOfDay(selectedDateObj);
      const endDate = endOfDay(selectedDateObj);

      const data = await getSalesByHour(startDate, endDate);
      setHourlyData(data);
    } catch (err) {
      console.error('Error loading hourly data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHourlyData(selectedDate);
  }, [selectedDate, user]);

  const formatHour = (hour: number) => `${hour}h`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const hour = parseInt(label);
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">
            {hour}h00 - {hour + 1}h00
          </p>
          <div className="space-y-1">
            <p className="text-sm text-blue-600">
              📦 Articles vendus: {data.sales}
            </p>
            <p className="text-sm text-green-600">
              🛒 Commandes: {data.orders}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const totalSales = hourlyData.reduce((sum, item) => sum + item.sales, 0);
  const totalOrders = hourlyData.reduce((sum, item) => sum + item.orders, 0);
  const peakHour = hourlyData.reduce((max, item) => 
    item.sales > max.sales ? item : max, 
    { hour: 0, sales: 0, orders: 0 }
  );

  if (!user?.profile?.is_admin) {
    return (
      <Card>
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Accès réservé aux administrateurs</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-6">
        {/* En-tête avec titre et sélecteur de date */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-500" />
              Ventes par heure
            </h3>
            <p className="text-sm text-gray-600">
              Répartition des ventes sur 24 heures
            </p>
          </div>

          {/* Sélecteur de date */}
          <div className="flex items-center space-x-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-sm"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b6b5a] focus:border-transparent transition-colors text-sm"
            />
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-800">Total articles</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{totalSales}</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="text-lg mr-2">🛒</span>
              <span className="text-sm font-medium text-green-800">Total commandes</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{totalOrders}</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <span className="text-lg mr-2">⏰</span>
              <span className="text-sm font-medium text-purple-800">Heure de pic</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {peakHour.sales > 0 ? `${peakHour.hour}h` : 'N/A'}
            </p>
          </div>
        </div>

        {/* Date sélectionnée */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Données du {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr })}
          </p>
        </div>

        {/* Graphique */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="w-4 h-4 border-2 border-[#8b6b5a] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Chargement des données...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Clock className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="hour" 
                  tickFormatter={formatHour}
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="sales" 
                  fill="#3b82f6" 
                  name="Articles vendus"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Message si aucune donnée */}
        {!isLoading && !error && hourlyData.every(item => item.sales === 0) && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Aucune vente ce jour-là
            </h4>
            <p className="text-gray-600">
              Aucune commande n'a été passée le {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};