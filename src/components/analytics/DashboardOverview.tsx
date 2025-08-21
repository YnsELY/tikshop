import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, ShoppingBag, DollarSign, Calendar, RefreshCw } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAnalytics, GlobalStats } from '../../hooks/useAnalytics';
import { SalesChart } from './SalesChart';
import { HourlySalesChart } from './HourlySalesChart';
import { BestSellersTable } from './BestSellersTable';
import { subDays, format } from 'date-fns';
import toast from 'react-hot-toast';

export const DashboardOverview: React.FC = () => {
  const { getGlobalStats, getSalesByPeriod, getSalesByHour, getBestSellers } = useAnalytics();
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const endDate = new Date();
      const days = 30; // Période fixe de 30 jours
      const startDate = subDays(endDate, days);

      const [stats, sales, sellers] = await Promise.all([
        getGlobalStats(),
        getSalesByPeriod(startDate, endDate, 'day'),
        getBestSellers(startDate, endDate, undefined, 5),
      ]);

      setGlobalStats(stats);
      setSalesData(sales);
      setBestSellers(sellers);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;

  const getGrowthIndicator = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, isPositive: true };
    const percentage = ((current - previous) / previous) * 100;
    return { percentage: Math.abs(percentage), isPositive: percentage >= 0 };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Analytics</h2>
          <p className="text-gray-600">Vue d'ensemble des performances de vente</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      {globalStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chiffre d'affaires total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(globalStats.total_revenue)}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">
                    {formatCurrency(globalStats.revenue_this_month)} ce mois
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total commandes</p>
                <p className="text-2xl font-bold text-gray-900">{globalStats.total_orders}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-blue-500 mr-1" />
                  <span className="text-sm text-blue-600">
                    {globalStats.orders_this_month} ce mois
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clients uniques</p>
                <p className="text-2xl font-bold text-gray-900">{globalStats.total_customers}</p>
                <div className="flex items-center mt-2">
                  <Users className="w-4 h-4 text-purple-500 mr-1" />
                  <span className="text-sm text-purple-600">Base clients</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Panier moyen</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(globalStats.avg_order_value)}
                </p>
                <div className="flex items-center mt-2">
                  <Calendar className="w-4 h-4 text-orange-500 mr-1" />
                  <span className="text-sm text-orange-600">
                    {globalStats.orders_today} commandes aujourd'hui
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Évolution des ventes</h3>
            <p className="text-sm text-gray-600">
              Ventes et revenus sur les 30 derniers jours
            </p>
          </div>
          <SalesChart data={salesData} />
        </Card>

        <div>
          <HourlySalesChart />
        </div>
      </div>

      {/* Best-sellers */}
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Top 5 des meilleures ventes</h3>
          <p className="text-sm text-gray-600">
            Produits les plus vendus sur les 30 derniers jours
          </p>
        </div>
        <BestSellersTable data={bestSellers} />
      </Card>
    </div>
  );
};