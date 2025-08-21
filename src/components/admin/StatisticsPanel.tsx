import React, { useState } from 'react';
import { BarChart3, TrendingUp, Trophy, ChevronDown } from 'lucide-react';
import { Card } from '../ui/Card';
import { DashboardOverview } from '../analytics/DashboardOverview';
import { ProductAnalytics } from '../analytics/ProductAnalytics';
import { BestSellersAnalytics } from '../analytics/BestSellersAnalytics';

type StatisticsTab = 'dashboard' | 'product-analytics' | 'bestsellers';

export const StatisticsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StatisticsTab>('dashboard');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard Global', icon: BarChart3, description: 'Vue d\'ensemble des performances' },
    { id: 'product-analytics' as const, label: 'Analyse Produits', icon: TrendingUp, description: 'Statistiques détaillées par produit' },
    { id: 'bestsellers' as const, label: 'Best-sellers', icon: Trophy, description: 'Classement des meilleures ventes' },
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Navigation des sous-onglets */}
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
                    <div>
                      <span className="font-medium block">{tab.label}</span>
                      <span className="text-xs text-gray-500">{tab.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Contenu des statistiques */}
      <div className="min-h-[400px]">
        {activeTab === 'dashboard' && <DashboardOverview />}
        {activeTab === 'product-analytics' && <ProductAnalytics />}
        {activeTab === 'bestsellers' && <BestSellersAnalytics />}
      </div>
    </div>
  );
};