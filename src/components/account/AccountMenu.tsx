import React from 'react';
import { User, Package, LogOut, Settings, ShoppingBag } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface AccountMenuProps {
  activeTab: 'profile' | 'orders' | 'admin';
  onTabChange: (tab: 'profile' | 'orders' | 'admin') => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({ activeTab, onTabChange }) => {
  const { signOut, user } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie');
      navigate('/');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const menuItems = [
    {
      id: 'profile' as const,
      label: 'Informations',
      icon: User,
    },
    {
      id: 'orders' as const,
      label: 'Commandes',
      icon: Package,
    },
    // Afficher l'onglet admin seulement si l'utilisateur est admin
    ...(user?.profile?.is_admin ? [{
      id: 'admin' as const,
      label: 'Administration',
      icon: Settings,
    }] : []),
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-2">
      <nav className="flex items-center justify-between">
        <div className="flex space-x-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={clsx(
                  'flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[#8b6b5a] text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center space-x-2 px-4 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span>Déconnexion</span>
        </button>
      </nav>
    </div>
  );
};