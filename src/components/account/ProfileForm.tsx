import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Shield } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useAuthStore } from '../../store/authStore';
import { useStripeSubscription } from '../../hooks/useStripeSubscription';
import { SubscriptionInfo } from './SubscriptionInfo';
import toast from 'react-hot-toast';

export const ProfileForm: React.FC = () => {
  const { user, updateProfile } = useAuthStore();
  const { getActiveSubscriptionPlan } = useStripeSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user?.profile?.first_name || '',
    last_name: user?.profile?.last_name || '',
    phone: user?.profile?.phone || '',
    address: user?.profile?.address || '',
    city: user?.profile?.city || '',
    postal_code: user?.profile?.postal_code || '',
    country: user?.profile?.country || '',
  });

  const activePlan = getActiveSubscriptionPlan();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateProfile(formData);
      toast.success('Profil mis à jour avec succès !');
    } catch (error) {
      console.error('Profile update failed:', error);
      toast.error('Échec de la mise à jour du profil. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="max-w-2xl mx-auto">
      {/* Informations personnelles */}
      <Card>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Informations personnelles</h2>
          
          {/* Affichage du statut admin et plan actif */}
          <div className="flex flex-wrap gap-2 mb-4">
            {user?.profile?.is_admin && (
              <div className="inline-flex items-center bg-gradient-to-r from-[#faeede] to-[#f5e6d3] border border-[#d4c4b0] px-4 py-2 rounded-full">
                <Shield className="w-5 h-5 text-[#755441] mr-2" />
                <span className="text-sm font-medium text-[#755441]">
                  Compte Administrateur
                </span>
              </div>
            )}
            
            {activePlan && (
              <div className="inline-flex items-center bg-gradient-to-r from-green-100 to-green-200 border border-green-300 px-4 py-2 rounded-full">
                <span className="text-sm font-medium text-green-800">
                  Plan: {activePlan}
                </span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Prénom"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              icon={<User className="w-5 h-5 text-gray-400" />}
              required
            />
            <Input
              label="Nom"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              icon={<User className="w-5 h-5 text-gray-400" />}
              required
            />
          </div>

          <Input
            label="Email"
            value={user?.email || ''}
            icon={<Mail className="w-5 h-5 text-gray-400" />}
            disabled
          />

          <Input
            label="Téléphone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleInputChange}
            icon={<Phone className="w-5 h-5 text-gray-400" />}
            required
          />

          <Input
            label="Adresse"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            icon={<MapPin className="w-5 h-5 text-gray-400" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Ville"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
            />
            <Input
              label="Code postal"
              name="postal_code"
              value={formData.postal_code}
              onChange={handleInputChange}
            />
            <Input
              label="Pays"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Mettre à jour le profil
          </Button>
        </form>
      </Card>
    </div>
  );
};