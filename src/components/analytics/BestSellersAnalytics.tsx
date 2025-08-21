import React, { useState, useEffect } from 'react';
import { Trophy, Filter, Download, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAnalytics, BestSeller } from '../../hooks/useAnalytics';
import { useProducts } from '../../store/productsStore';
import { BestSellersTable } from './BestSellersTable';
import { subDays } from 'date-fns';
import toast from 'react-hot-toast';

export const BestSellersAnalytics: React.FC = () => {
  const { getBestSellers } = useAnalytics();
  const { products } = useProducts();
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [category, setCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'quantity' | 'revenue' | 'orders'>('quantity');
  const [limit, setLimit] = useState<number>(20);

  // Obtenir les catégories uniques
  const categories = ['all', ...new Set(products.map(p => p.category))];

  const loadBestSellers = async () => {
    setIsLoading(true);
    try {
      const endDate = new Date();
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = subDays(endDate, days);

      const sellers = await getBestSellers(
        startDate, 
        endDate, 
        category === 'all' ? undefined : category, 
        limit
      );

      // Trier selon le critère sélectionné
      const sortedSellers = [...sellers].sort((a, b) => {
        switch (sortBy) {
          case 'revenue':
            return b.total_revenue - a.total_revenue;
          case 'orders':
            return b.orders_count - a.orders_count;
          default:
            return b.total_quantity - a.total_quantity;
        }
      });

      setBestSellers(sortedSellers);
    } catch (error) {
      console.error('Error loading best sellers:', error);
      toast.error('Erreur lors du chargement des meilleures ventes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBestSellers();
  }, [period, category, sortBy, limit]);

  const exportData = () => {
    if (bestSellers.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const csvContent = [
      ['Rang', 'Produit', 'Référence', 'Catégorie', 'Quantité', 'Revenus', 'Commandes'].join(','),
      ...bestSellers.map((item, index) => [
        index + 1,
        `"${item.product_name}"`,
        item.product_reference,
        item.category,
        item.total_quantity,
        item.total_revenue.toFixed(2),
        item.orders_count
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `best-sellers-${period}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Données exportées avec succès');
  };

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;

  const getTotalStats = () => {
    return {
      totalQuantity: bestSellers.reduce((sum, item) => sum + item.total_quantity, 0),
      totalRevenue: bestSellers.reduce((sum, item) => sum + item.total_revenue, 0),
      totalOrders: bestSellers.reduce((sum, item) => sum + item.orders_count, 0),
    };
  };

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Meilleures ventes</h2>
          <p className="text-gray-600">Classement des produits les plus performants</p>
        </div>
        
        <Button variant="outline" onClick={exportData} disabled={isLoading || bestSellers.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Période
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b6b5a] focus:border-transparent transition-colors"
            >
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="90d">90 derniers jours</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catégorie
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b6b5a] focus:border-transparent transition-colors"
            >
              <option value="all">Toutes les catégories</option>
              {categories.slice(1).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trier par
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b6b5a] focus:border-transparent transition-colors"
            >
              <option value="quantity">Quantité vendue</option>
              <option value="revenue">Chiffre d'affaires</option>
              <option value="orders">Nombre de commandes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de résultats
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8b6b5a] focus:border-transparent transition-colors"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Statistiques globales */}
      {bestSellers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total articles vendus</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalQuantity}</p>
                <p className="text-sm text-gray-500 mt-1">sur la période</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenus générés</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-sm text-gray-500 mt-1">par ces produits</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Commandes concernées</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalOrders}</p>
                <p className="text-sm text-gray-500 mt-1">au total</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Filter className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tableau des meilleures ventes */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              Top {limit} des meilleures ventes
            </h3>
            <p className="text-sm text-gray-600">
              {period === '7d' ? '7 derniers jours' : period === '30d' ? '30 derniers jours' : '90 derniers jours'}
              {category !== 'all' && ` • Catégorie: ${category}`}
            </p>
          </div>
          
          {isLoading && (
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Chargement...</span>
            </div>
          )}
        </div>

        <BestSellersTable data={bestSellers} />
      </Card>
    </div>
  );
};