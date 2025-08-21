import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signIn(formData.email, formData.password);
      toast.success('Bienvenue !');
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Email ou mot de passe incorrect');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
          <p className="text-gray-600">Bienvenue sur CocoLive</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            Se connecter
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Vous n'avez pas de compte ?{' '}
            <Link to="/register" className="text-primary-500 hover:text-primary-600 font-medium">
              S'inscrire
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};