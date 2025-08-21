import React from 'react';
import { Search, BookOpen, Sparkles, ArrowUp } from 'lucide-react';
import { ProductSearch } from '../components/product/ProductSearch';
import { TutorialSection } from '../components/home/TutorialSection';

export const HomePage: React.FC = () => {
  return (
    <div className="w-full overflow-x-hidden">
      <div className="space-y-24">
        {/* Section principale avec titre et recherche */}
        <div className="min-h-[50vh] flex flex-col items-center justify-center pt-12 px-4 sm:px-6 lg:px-8">
          {/* Titre principal de la section */}
          <div className="text-center mb-12 max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Trouvez votre produit
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#755441] to-[#8b6b5a]">
                instantanément
              </span>
            </h1>
          </div>

          <div className="w-full max-w-2xl mx-auto text-center">
            <ProductSearch />
          </div>
        </div>

        {/* Section tutoriel avec titre */}
        <div className="py-16 px-4 sm:px-6 lg:px-8">
          {/* Titre de la section tutoriel */}
          <div className="text-center mb-16 max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#8b6b5a] to-[#a0806f] rounded-2xl mb-6 shadow-lg">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Comment ça marche ?
            </h2>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
              Découvrez en 4 étapes simples comment commander vos produits préférés sur CocoLive
            </p>
          </div>

          <TutorialSection />
        </div>

        {/* Section finale avec CTA */}
        <div className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#a0806f] to-[#b59584] rounded-2xl mb-6 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Prêt à commencer ?
            </h2>
            <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
              Rejoignez des milliers d'utilisateurs qui font confiance à CocoLive pour leurs achats
            </p>
            
            {/* CTA final */}
            <div className="bg-gradient-to-br from-[#755441] to-[#8b6b5a] rounded-3xl p-8 text-white shadow-2xl">
              {/* Éléments décoratifs animés */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-white bg-opacity-10 rounded-full -translate-x-16 -translate-y-16 animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-white bg-opacity-10 rounded-full translate-x-12 translate-y-12 animate-bounce"></div>
              <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-white bg-opacity-20 rounded-full animate-ping"></div>
              <div className="absolute top-1/4 right-1/3 w-6 h-6 bg-white bg-opacity-15 rounded-full animate-pulse"></div>
              
              <div className="relative z-10">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                Votre prochain achat vous attend !
              </h3>
              <p className="text-lg mb-6 opacity-90">
                Utilisez le formulaire de recherche ci-dessus pour découvrir votre produit
              </p>
              
              {/* Badges avec animations déplacés ici */}
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                {[
                  { icon: '⚡', text: 'Livraison Express', delay: '0s' },
                  { icon: '🔒', text: 'Paiement Sécurisé', delay: '0.2s' },
                  { icon: '💬', text: 'Support 24/7', delay: '0.4s' },
                  { icon: '🎯', text: 'Satisfaction Garantie', delay: '0.6s' }
                ].map((badge, index) => (
                  <div 
                    key={index}
                    className="flex items-center space-x-2 bg-[#faeede] bg-opacity-20 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg hover:bg-opacity-30 transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: badge.delay }}
                  >
                    <span className="text-lg">{badge.icon}</span>
                    <span className="text-sm font-medium">{badge.text}</span>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center space-x-2 bg-white text-[#755441] px-8 py-4 rounded-2xl font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <ArrowUp className="w-5 h-5" />
                <span>Commencer ma recherche</span>
              </button>
              </div>
            </div>
          </div>
        </div>

        {/* Marge supplémentaire avant le footer */}
        <div className="pb-16"></div>
      </div>
    </div>
  );
};