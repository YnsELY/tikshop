import React, { useState } from 'react';
import { Plus, ShoppingBag, Package, BarChart3, ChevronDown } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ProductForm } from './ProductForm';
import { ProductManagement } from './ProductManagement';
import { OrderManagement } from './OrderManagement';
import { StatisticsPanel } from './StatisticsPanel.tsx';

type AdminTab = 'overview' | 'statistics' | 'products' | 'orders';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [showProductForm, setShowProductForm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const tabs = [
    { id: 'overview' as const, label: 'Vue d\'ensemble', icon: ShoppingBag },
    { id: 'products' as const, label: 'Produits', icon: Package },
    { id: 'orders' as const, label: 'Commandes', icon: ShoppingBag },
    { id: 'statistics' as const, label: 'Statistiques', icon: BarChart3 },
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="space-y-6">
      {/* En-tête admin */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Administration de la plateforme
            </h2>
            <p className="text-gray-600">
              Gérez les produits, commandes et analysez les performances de CocoLive
            </p>
          </div>
        </div>
      </Card>

      {/* Navigation des onglets - Desktop et Mobile */}
      <Card padding="sm">
        {/* Navigation Desktop */}
        <div className="hidden lg:flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#8b6b5a] text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Navigation Mobile/Tablet - Menu déroulant */}
        <div className="lg:hidden relative">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="w-full flex items-center justify-between px-4 py-3 bg-[#8b6b5a] text-white rounded-lg font-medium"
          >
            <div className="flex items-center space-x-2">
              {activeTabData && (
                <>
                  <activeTabData.icon className="w-5 h-5" />
                  <span>{activeTabData.label}</span>
                </>
              )}
            </div>
            <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${
              showMobileMenu ? 'rotate-180' : ''
            }`} />
          </button>

          {/* Menu déroulant mobile */}
          {showMobileMenu && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                      isActive
                        ? 'bg-[#faeede] text-[#755441] border-l-4 border-[#8b6b5a]'
                        : 'text-gray-700 hover:bg-gray-50'
                    } ${tab.id !== tabs[tabs.length - 1].id ? 'border-b border-gray-100' : ''}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Contenu des onglets */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            <Card className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Gestion des produits</h3>
              <p className="text-gray-600 mb-4">
                Créez et gérez le catalogue de produits
              </p>
              <Button onClick={() => setActiveTab('products')}>
                Gérer les produits
              </Button>
            </Card>

            <Card className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Gestion des commandes</h3>
              <p className="text-gray-600 mb-4">
                Suivez et mettez à jour les commandes
              </p>
              <Button onClick={() => setActiveTab('orders')}>
                Voir les commandes
              </Button>
            </Card>

            <Card className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Statistiques & Analytics</h3>
              <p className="text-gray-600 mb-4">
                Dashboard complet, analyse par produit et classement des meilleures ventes
              </p>
              <Button onClick={() => setActiveTab('statistics')}>
                Voir les statistiques
              </Button>
            </Card>
          </div>
        )}

        {activeTab === 'products' && <ProductManagement />}
        {activeTab === 'orders' && <OrderManagement />}
        {activeTab === 'statistics' && <StatisticsPanel />}
      </div>
    </div>
  );
};