import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { usePageVisibility } from './hooks/usePageVisibility';
import { useSessionWatchdog } from './lib/sessionWatchdog';
import { StripeProvider } from './components/stripe/StripeProvider';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { StripeProductsPage } from './pages/StripeProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccountPage } from './pages/AccountPage';
import { SuccessPage } from './pages/SuccessPage';
import { useAuthStore } from './store/authStore';

// Composant de protection des routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuthStore();
  const { isSessionReady } = useSessionWatchdog();
  
  // Pendant le rechargement automatique, ne pas afficher le spinner si on a un utilisateur en cache
  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8b6b5a] mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }
  
  // Si on a un utilisateur en cache, le laisser passer même si la session n'est pas encore vérifiée
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const { initialize, updateActivity } = useAuthStore();
  usePageVisibility(); // Utilise le hook pour la détection automatique

  useEffect(() => {
    console.log('🚀 App mounting, initializing auth...');
    initialize();
    
    updateActivity();
    
    // Nettoyer la localisation sauvegardée au démarrage de l'app (optionnel)
    // localStorage.removeItem('cocolive-last-location');
  }, [initialize, updateActivity]);

  return (
    <StripeProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<StripeProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/cart" element={
              <ProtectedRoute>
                <CartPage />
              </ProtectedRoute>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            } />
            <Route path="/success" element={
              <ProtectedRoute>
                <SuccessPage />
              </ProtectedRoute>
            } />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            } />
          </Routes>
        </Layout>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
          containerStyle={{
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        />
      </Router>
    </StripeProvider>
  );
}

export default App;