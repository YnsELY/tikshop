import React, { useState } from 'react';
import { X, Mail, Lock, User } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Connexion requise",
  subtitle = "Connectez-vous pour continuer"
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await signIn(formData.email, formData.password);
        toast.success('Connexion réussie !');
      } else {
        await signUp(formData.email, formData.password, {
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: '',
        });
        toast.success('Compte créé avec succès !');
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Auth failed:', error);
      if (mode === 'login') {
        toast.error('Email ou mot de passe incorrect');
      } else {
        toast.error('Échec de la création du compte. Veuillez réessayer.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
    });
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    resetForm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Prénom"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              icon={<User className="w-5 h-5 text-gray-400" />}
              required
            />
            <Input
              label="Nom"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              icon={<User className="w-5 h-5 text-gray-400" />}
              required
            />
          </div>
        )}

        <Input
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          icon={<Mail className="w-5 h-5 text-gray-400" />}
          required
        />

        <Input
          label="Mot de passe"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleInputChange}
          icon={<Lock className="w-5 h-5 text-gray-400" />}
          required
        />

        <Button type="submit" className="w-full" isLoading={isLoading}>
          {mode === 'login' ? 'Se connecter' : "S'inscrire"}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          {mode === 'login' ? "Vous n'avez pas de compte ?" : 'Vous avez déjà un compte ?'}{' '}
          <button
            type="button"
            onClick={switchMode}
            className="text-primary-500 hover:text-primary-600 font-medium"
          >
            {mode === 'login' ? "S'inscrire" : 'Se connecter'}
          </button>
        </p>
      </div>
    </Modal>
  );
};