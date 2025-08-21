import React from 'react';
import { Search, ShoppingCart, Package, CheckCircle, ArrowRight } from 'lucide-react';

export const TutorialSection: React.FC = () => {
  const steps = [
    {
      number: 1,
      icon: Search,
      title: 'Recherchez votre produit',
      description: 'Entrez la référence du produit que vous avez vu dans une vidéo TikTok ou reçue d\'un créateur.',
      example: 'Ex: TSHIRT-BIO-2025',
      // Carte 1 - Marron foncé
      color: 'from-[#755441] to-[#8b6b5a]',
      bgColor: 'bg-[#755441]',
      lightColor: 'bg-[#faeede]',
      borderColor: 'border-[#d4c4b0]',
    },
    {
      number: 2,
      icon: ShoppingCart,
      title: 'Ajoutez au panier',
      description: 'Consultez les détails du produit et ajoutez-le à votre panier en quelques clics.',
      example: 'Prix, description, stock disponible',
      // Carte 2 - Marron moyen
      color: 'from-[#8b6b5a] to-[#a0806f]',
      bgColor: 'bg-[#8b6b5a]',
      lightColor: 'bg-[#faeede]',
      borderColor: 'border-[#d4c4b0]',
    },
    {
      number: 3,
      icon: Package,
      title: 'Finalisez votre commande',
      description: 'Remplissez vos informations de livraison et choisissez votre point de retrait préféré.',
      example: 'Livraison rapide et sécurisée',
      // Carte 3 - Marron clair
      color: 'from-[#a0806f] to-[#b59584]',
      bgColor: 'bg-[#a0806f]',
      lightColor: 'bg-[#faeede]',
      borderColor: 'border-[#d4c4b0]',
    },
    {
      number: 4,
      icon: CheckCircle,
      title: 'Recevez votre produit',
      description: 'Suivez votre commande en temps réel et récupérez votre produit au point relais choisi.',
      example: 'Suivi en temps réel',
      // Carte 4 - Beige
      color: 'from-[#b59584] to-[#c9aa99]',
      bgColor: 'bg-[#b59584]',
      lightColor: 'bg-[#faeede]',
      borderColor: 'border-[#d4c4b0]',
    },
  ];

  return (
    <div className="space-y-12">
      {/* Roadmap Container */}
      <div className="relative max-w-6xl mx-auto">
        {/* Ligne de connexion principale avec dégradé marron vers beige */}
        <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-[#755441] via-[#8b6b5a] via-[#a0806f] to-[#c9aa99] transform -translate-y-1/2 z-0"></div>
        
        {/* Points de connexion animés */}
        <div className="hidden lg:block absolute top-1/2 left-0 right-0 transform -translate-y-1/2 z-10">
          <div className="flex justify-between px-8">
            {steps.map((_, index) => (
              <div key={index} className="relative">
                <div className="w-4 h-4 bg-white border-4 border-gray-300 rounded-full animate-pulse"></div>
                {index < steps.length - 1 && (
                  <div className="absolute top-1/2 left-4 transform -translate-y-1/2">
                    <ArrowRight className="w-6 h-6 text-gray-400 animate-bounce" style={{ animationDelay: `${index * 0.5}s` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Étapes de la roadmap */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-20">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 0;
            
            return (
              <div 
                key={step.number} 
                className={`relative ${isEven ? 'lg:mt-0' : 'lg:mt-16'} group`}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                {/* Carte principale - Animations désactivées sur mobile */}
                <div className={`relative ${step.lightColor} ${step.borderColor} border-2 rounded-3xl p-6 shadow-lg md:hover:shadow-2xl transition-all duration-500 transform md:hover:-translate-y-2 md:group-hover:scale-105`}>
                  
                  {/* Badge numéro avec animation et dégradé personnalisé */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className={`w-12 h-12 bg-gradient-to-r ${step.color} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg animate-bounce`}>
                      {step.number}
                    </div>
                  </div>

                  {/* Icône principale avec effet hover et dégradé personnalisé */}
                  <div className="mt-6 mb-6 text-center">
                    <div className={`w-20 h-20 bg-gradient-to-r ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-4 md:group-hover:rotate-12 transition-transform duration-300 shadow-lg`}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {step.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      {step.description}
                    </p>
                  </div>

                  {/* Badge exemple avec style ludique et couleur personnalisée */}
                  <div className={`${step.bgColor} bg-opacity-10 rounded-xl p-3 border ${step.borderColor} backdrop-blur-sm`}>
                    <p className="text-xs font-semibold text-gray-700 text-center">
                      💡 {step.example}
                    </p>
                  </div>

                  {/* Effet de brillance au hover - Désactivé sur mobile */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 md:group-hover:opacity-20 transform -skew-x-12 md:group-hover:translate-x-full transition-all duration-1000 rounded-3xl"></div>
                </div>

                {/* Flèche de connexion mobile avec dégradé */}
                <div className="lg:hidden flex justify-center my-4">
                  {index < steps.length - 1 && (
                    <div className="flex flex-col items-center">
                      <div className={`w-1 h-8 bg-gradient-to-b ${step.color} rounded-full`}></div>
                      <div className={`w-3 h-3 ${step.bgColor} rounded-full animate-pulse`}></div>
                      <div className={`w-1 h-8 bg-gradient-to-b ${steps[index + 1].color} rounded-full`}></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};