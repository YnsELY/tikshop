import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Clock, Calendar, BarChart3 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useProducts } from '../../store/productsStore';
import { useAnalytics, ProductStats } from '../../hooks/useAnalytics';
import { SalesChart } from './SalesChart';
import { ProductHourlySalesChart } from './ProductHourlySalesChart';
import { subDays, format } from 'date-fns';
import toast from 'react-hot-toast';

export const ProductAnalytics: React.FC = () => {
  const { products } = useProducts();
  const { getProductStats } = useAnalytics();
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [productStats, setProductStats] = useState<ProductStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const loadProductStats = async (productId: string) => {
    if (!productId) return;

    setIsLoading(true);
    try {
      const endDate = new Date();
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = subDays(endDate, days);

      const stats = await getProductStats(productId, startDate, endDate);
      setProductStats(stats);
    } catch (error) {
      console.error('Error loading product stats:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      loadProductStats(selectedProduct);
    }
  }, [selectedProduct, period]);

  const selectedProductData = products.find(p => p.id === selectedProduct);

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyse par produit</h2>
        <p className="text-gray-600">Statistiques détaillées pour un produit spécifique</p>
      </div>

      {/* Sélection du produit */}
      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher un produit
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Nom ou référence du produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="sm:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Période d'analyse
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              >
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
                <option value="90d">90 derniers jours</option>
              </select>
            </div>
          </div>

          {/* Liste des produits filtrés */}
          {searchTerm && (
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredProducts.length === 0 ? (
                <p className="p-4 text-gray-500 text-center">Aucun produit trouvé</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredProducts.slice(0, 10).map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        setSelectedProduct(product.id);
                        setSearchTerm('');
                      }}
                      className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            REF: {product.reference} • {product.category}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Produit sélectionné */}
      {selectedProductData && (
        <Card>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={selectedProductData.image_url}
                alt={selectedProductData.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedProductData.name}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>REF: {selectedProductData.reference}</span>
                <span>{selectedProductData.category}</span>
                <span>{formatCurrency(selectedProductData.price)}</span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedProduct('')}
            >
              Changer de produit
            </Button>
          </div>
        </Card>
      )}

      {/* Statistiques du produit */}
      {isLoading ? (
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
      ) : productStats ? (
        <>
          {/* Métriques du produit */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total vendu</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {productStats.total_quantity}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">articles</p>
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
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(productStats.total_revenue)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">sur la période</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Heure de pic</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {productStats.peak_hour}h
                  </p>
                  <p className="text-sm text-gray-500 mt-1">meilleure heure</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Jour de pic</p>
                  <p className="text-xl font-bold text-gray-900">
                    {productStats.peak_day ? format(new Date(productStats.peak_day), 'dd/MM') : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">meilleur jour</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Graphiques du produit */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Évolution des ventes</h3>
                <p className="text-sm text-gray-600">
                  Nombre de commandes jour par jour
                </p>
              </div>
              <SalesChart data={productStats.daily_sales} showMetricSelector={false} />
            </Card>

            <div>
              {selectedProductData && (
                <ProductHourlySalesChart 
                  productId={selectedProductData.id}
                  productName={selectedProductData.name}
                />
              )}
            </div>
          </div>
        </>
      ) : selectedProduct ? (
        <Card>
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune donnée disponible
            </h3>
            <p className="text-gray-600">
              Ce produit n'a pas encore été vendu sur la période sélectionnée
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Sélectionnez un produit
            </h3>
            <p className="text-gray-600">
              Utilisez la barre de recherche ci-dessus pour analyser un produit spécifique
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};