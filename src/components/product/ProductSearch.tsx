import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, ArrowRight } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { AuthModal } from '../auth/AuthModal';
import { useProducts } from '../../store/productsStore';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export const ProductSearch: React.FC = () => {
  const [reference, setReference] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<{ id: string; reference: string } | null>(null);
  
  const { getProductByReference } = useProducts();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleSearch = async () => {
    console.log('🔍 Début recherche produit:', reference);
    console.log('🔍 État initial - isSearching:', isSearching, 'user:', !!user);
    console.log('📡 handleSearch: About to start product search...');
    
    if (!reference.trim()) {
      console.log('❌ handleSearch: Empty reference, aborting');
      toast.error('Veuillez entrer une référence');
      return;
    }

    // Empêcher les recherches multiples simultanées
    if (isSearching) {
      console.log('⚠️ Recherche déjà en cours, ignorée');
      return;
    }

    // Validation des entrées avant de commencer
    const cleanRef = reference.trim();
    if (!cleanRef) {
      console.log('❌ handleSearch: Reference is empty after trim');
      toast.error('Veuillez entrer une référence valide');
      return;
    }

    setIsSearching(true);
    console.log('🔄 handleSearch: Loading state set to true');
    
    try {
      console.log('📡 Appel getProductByReference...');
      console.log('📡 Référence nettoyée:', cleanRef);
      console.log('📡 handleSearch: About to call getProductByReference...');
      
      const product = await getProductByReference(cleanRef);
      console.log('📬 handleSearch: getProductByReference completed');
      console.log('📦 Résultat recherche:', product ? 'trouvé' : 'non trouvé');
      
      if (product) {
        console.log('📦 Détails produit trouvé:', {
          id: product.id,
          name: product.name,
          reference: product.reference
        });
      }
      
      if (product) {
        // Vérifier si l'utilisateur est connecté
        if (!user) {
          console.log('🔐 Utilisateur non connecté, ouverture modal auth');
          // Stocker les infos du produit pour redirection après connexion
          setPendingProduct({ id: product.id, reference: cleanRef });
          console.log('🔄 handleSearch: Setting loading to false before auth modal');
          setIsSearching(false);
          setShowAuthModal(true);
          return;
        }
        
        // Rediriger immédiatement vers la page produit si connecté
        console.log('✅ Redirection vers produit:', product.id);
        console.log('🔄 handleSearch: Setting loading to false before navigation');
        setIsSearching(false);
        console.log('🎯 Navigation vers /products/' + product.id);
        navigate(`/products/${product.id}`);
      } else {
        console.log('❌ Produit non trouvé pour référence:', cleanRef);
        toast.error(`Aucun produit trouvé avec la référence "${cleanRef}"`);
      }
    } catch (error) {
      console.error('❌ Erreur recherche:', error);
      console.log('❌ Type d\'erreur:', typeof error, error);
      toast.error('Erreur lors de la recherche');
    } finally {
      console.log('🏁 handleSearch: Finally block - setting loading to false');
      setIsSearching(false);
      console.log('📡 handleSearch: Process completed');
    }
    
    console.log('🏁 Fin handleSearch');
  };

  const handleAuthSuccess = async () => {
    console.log('✅ Authentification réussie');
    console.log('✅ PendingProduct:', pendingProduct);
    setIsSearching(false); // IMPORTANT: Reset après auth
    
    // Rechercher à nouveau le produit après connexion réussie
    if (pendingProduct) {
      console.log('🔍 Re-recherche du produit après auth:', pendingProduct.reference);
      
      try {
        const product = await getProductByReference(pendingProduct.reference);
        
        if (product) {
          console.log('🎯 Redirection vers produit après auth:', product.id);
          navigate(`/products/${product.id}`);
        } else {
          console.log('❌ Produit non trouvé après auth');
          toast.error(`Produit "${pendingProduct.reference}" non trouvé`);
        }
      } catch (error) {
        console.error('❌ Erreur re-recherche après auth:', error);
        toast.error('Erreur lors de la recherche du produit');
      }
      
      setPendingProduct(null);
    }
    setShowAuthModal(false);
  };

  const handleAuthModalClose = () => {
    console.log('❌ Modal d\'authentification fermée');
    console.log('❌ Reset isSearching et pendingProduct');
    setIsSearching(false); // IMPORTANT: Reset à la fermeture
    setShowAuthModal(false);
    setPendingProduct(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <>
      <div className="relative w-full max-w-2xl mx-auto px-2 sm:px-6">
        {/* Éléments décoratifs animés - Repositionnés pour éviter le débordement */}
        <div className="hidden md:block absolute -top-8 left-8 w-16 h-16 bg-gradient-to-r from-[#c9aa99] to-[#b59584] rounded-full opacity-30 animate-float shadow-lg"></div>
        <div className="hidden md:block absolute -bottom-6 right-8 w-12 h-12 bg-gradient-to-r from-[#a0806f] to-[#8b6b5a] rounded-full opacity-40 animate-bounce shadow-md"></div>
        <div className="hidden md:block absolute top-1/2 left-4 w-2 h-2 bg-gradient-to-r from-[#755441] to-[#8b6b5a] rounded-full animate-ping"></div>
        <div className="hidden md:block absolute top-1/4 right-4 w-3 h-3 bg-gradient-to-r from-[#8b6b5a] to-[#a0806f] rounded-full animate-pulse"></div>

        {/* Container principal avec effet glassmorphism - Plus large sur mobile */}
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-4 md:p-8 shadow-2xl border border-white/20 w-full">
          
          {/* Logo central avec animation - Agrandi */}
          <div className="relative z-10 text-center mb-6">
            <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4 group">
              {/* Conteneur 3D avec perspective */}
              <div className="relative w-full h-full transform-gpu transition-all duration-700 group-hover:scale-110 group-hover:rotate-y-12" style={{ transformStyle: 'preserve-3d' }}>
                {/* Fond principal avec dégradé et ombres multiples */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#faeede] via-[#f5e6d3] to-[#f0ddc8] rounded-2xl shadow-2xl transform transition-all duration-500 group-hover:shadow-3xl group-hover:shadow-[#755441]/30 border-2 border-[#755441]/20"></div>
                
                {/* Couche de brillance supérieure */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent rounded-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
                
                {/* Reflet animé */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-2xl transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
                
                {/* Icône de loupe 3D sophistiquée */}
                <div className="relative z-10 w-full h-full flex items-center justify-center">
                  {/* Cercle principal de la loupe avec effet 3D */}
                  <div className="relative">
                    {/* Ombre portée de la loupe */}
                    <div className="absolute top-1 left-1 w-10 h-10 rounded-full bg-black/20 blur-sm"></div>
                    
                    {/* Cercle principal */}
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-white via-gray-100 to-gray-300 border-3 border-[#755441]/30 shadow-inner transform group-hover:scale-110 transition-transform duration-300">
                      {/* Reflet interne du verre */}
                      <div className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-gradient-to-br from-white/80 to-transparent"></div>
                      
                      {/* Bordure métallique */}
                      <div className="absolute inset-0 rounded-full border-2 border-[#755441]/40"></div>
                    </div>
                    
                    {/* Manche de la loupe */}
                    <div className="absolute -bottom-3 -right-3 w-8 h-2 bg-gradient-to-r from-[#755441] to-[#6d4a37] rounded-full transform rotate-45 shadow-lg group-hover:rotate-[50deg] transition-transform duration-300">
                      {/* Reflet sur le manche */}
                      <div className="absolute top-0 left-1.5 w-4 h-0.5 bg-gradient-to-r from-white/40 to-transparent rounded-full"></div>
                    </div>
                    
                    {/* Particules magiques autour de la loupe */}
                    <div className="absolute -top-3 -left-3 w-1.5 h-1.5 bg-[#755441] rounded-full animate-ping opacity-75 group-hover:opacity-100"></div>
                    <div className="absolute -bottom-2 -left-4 w-1 h-1 bg-[#8b6b5a] rounded-full animate-pulse delay-300"></div>
                    <div className="absolute -top-4 right-1 w-1 h-1 bg-[#a0806f] rounded-full animate-bounce delay-500"></div>
                    
                    {/* Effet de recherche - ondes */}
                    <div className="absolute inset-0 rounded-full border-2 border-[#755441]/30 animate-ping group-hover:animate-pulse"></div>
                    <div className="absolute inset-0 rounded-full border border-[#755441]/20 animate-ping delay-200 group-hover:animate-pulse"></div>
                  </div>
                </div>
                
                {/* Ombre portée du conteneur */}
                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-24 h-5 bg-black/10 rounded-full blur-md group-hover:w-28 group-hover:bg-black/15 transition-all duration-500"></div>
              </div>
              
              {/* Halo lumineux animé */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#755441]/20 to-[#8b6b5a]/20 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-pulse"></div>
            </div>
            <p className="text-gray-600">Entrez votre référence produit</p>
          </div>

          {/* Barre de recherche moderne - Layout responsive */}
          <div className="relative z-10 w-full">
            {/* Desktop: côte à côte */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex-1 relative group">
                {/* Input avec effet de focus avancé - SANS indicateur de saisie */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Trouvez votre produit"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-6 py-4 pl-14 text-lg bg-white/90 backdrop-blur-sm border-2 border-[#d4c4b0] rounded-2xl focus:outline-none focus:border-[#8b6b5a] focus:ring-4 focus:ring-[#8b6b5a]/20 transition-all duration-300 shadow-lg hover:shadow-xl group-hover:border-[#a0806f]"
                  />
                  
                  {/* Icône dans l'input */}
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-6 h-6 text-gray-400 group-focus-within:text-[#8b6b5a] transition-colors duration-300" />
                  </div>

                  {/* Effet de brillance au focus */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#faeede]/50 via-transparent to-[#faeede]/50 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              {/* Bouton de recherche desktop avec dégradé rouge-rose */}
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="relative group px-8 py-4 bg-gradient-to-r from-[#755441] via-[#8b6b5a] to-[#a0806f] text-white font-semibold rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
              >
                {/* Effet de brillance au hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                
                <div className="relative flex items-center space-x-2">
                  {isSearching ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Recherche...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Rechercher</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                  )}
                </div>
              </button>
            </div>

            {/* Mobile: empilé verticalement avec plus d'espace horizontal */}
            <div className="md:hidden space-y-4 w-full -mx-2">
              <div className="relative group w-full px-2">
                {/* Input mobile - Plus large - SANS indicateur de saisie */}
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Trouvez votre produit"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-6 py-4 pl-14 text-lg bg-white/90 backdrop-blur-sm border-2 border-[#d4c4b0] rounded-2xl focus:outline-none focus:border-[#8b6b5a] focus:ring-4 focus:ring-[#8b6b5a]/20 transition-all duration-300 shadow-lg"
                  />
                  
                  {/* Icône dans l'input */}
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-6 h-6 text-gray-400 group-focus-within:text-[#8b6b5a] transition-colors duration-300" />
                  </div>

                  {/* Effet de brillance au focus */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#faeede]/50 via-transparent to-[#faeede]/50 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              </div>

              {/* Bouton de recherche mobile - pleine largeur avec marge et dégradé rouge-rose */}
              <div className="px-2">
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="relative group w-full px-8 py-4 bg-gradient-to-r from-[#755441] via-[#8b6b5a] to-[#a0806f] text-white font-semibold rounded-2xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  {/* Effet de brillance au hover - désactivé sur mobile */}
                  <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  
                  <div className="relative flex items-center justify-center space-x-2">
                    {isSearching ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Recherche...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Rechercher</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Particules flottantes - Cachées sur mobile pour éviter le débordement */}
        <div className="hidden md:block absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-gradient-to-r from-[#755441] to-[#8b6b5a] rounded-full animate-ping opacity-50"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 2) * 40}%`,
                animationDelay: `${i * 0.8}s`,
                animationDuration: '2s'
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Modal d'authentification */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        onSuccess={handleAuthSuccess}
        title="Connexion requise"
        subtitle="Connectez-vous pour voir les détails du produit"
      />
    </>
  );
};