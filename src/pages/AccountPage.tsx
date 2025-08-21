import React, { useState } from 'react';
import { AccountMenu } from '../components/account/AccountMenu';
import { ProfileForm } from '../components/account/ProfileForm';
import { OrderHistory } from '../components/orders/OrderHistory';
import { AdminPanel } from '../components/admin/AdminPanel';
import { useAuthStore } from '../store/authStore';

export const AccountPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'admin'>('profile');
  const { user } = useAuthStore();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <AccountMenu activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="min-h-[400px]">
        {activeTab === 'profile' && <ProfileForm />}
        {activeTab === 'orders' && <OrderHistory />}
        {activeTab === 'admin' && user?.profile?.is_admin && <AdminPanel />}
      </div>
    </div>
  );
};