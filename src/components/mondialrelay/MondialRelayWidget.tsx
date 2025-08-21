import React, { useEffect, useRef } from 'react';
import { MapPin, CheckCircle } from 'lucide-react';

interface RelayPoint {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  distance?: string;
}

interface MondialRelayWidgetProps {
  onSelect: (relayPoint: RelayPoint | null) => void;
  selectedPoint?: RelayPoint | null;
}

declare global {
  interface Window {
    $: any;
    jQuery: any;
  }
}

export const MondialRelayWidget: React.FC<MondialRelayWidgetProps> = ({
  onSelect,
  selectedPoint,
}) => {
  const widgetRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLInputElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Attendre que jQuery et le plugin soient chargés
    const initializeWidget = () => {
      if (!window.$ || !window.$.fn.MR_ParcelShopPicker) {
        console.log('⏳ En attente du chargement de jQuery et du plugin Mondial Relay...');
        setTimeout(initializeWidget, 100);
        return;
      }

      if (isInitialized.current || !widgetRef.current) {
        return;
      }

      console.log('🚀 Initialisation du widget Mondial Relay inline...');

      try {
        window.$(widgetRef.current).MR_ParcelShopPicker({
          // Configuration de base
          Brand: 'CC23KAUY',
          Country: 'FR',
          Language: 'FR',
          
          // Paramètres d'affichage
          NbResults: '7',
          SearchDelay: '0',
          ShowResultsNumberTop: true,
          ShowResultsNumberBottom: true,
          
          // Paramètres de recherche
          PostCode: '',
          City: '',
          SearchRadius: '20000', // 20km de rayon de recherche
          Weight: '1000', // 1kg par défaut
          
          // Types de points relais
          ColLivMod: '24R',
          
          // Google Maps
          EnableGoogleMaps: true,
          
          // Callback principal
          OnParcelShopSelected: function(data: any) {
            console.log('✅ Point relais sélectionné:', data);
            
            if (targetRef.current) {
              targetRef.current.value = data.ID;
            }
            
            const relayPoint: RelayPoint = {
              id: data.ID,
              name: data.Nom,
              address: data.Adresse1,
              city: data.Ville,
              postalCode: data.CP,
              distance: data.Distance ? `${data.Distance}m` : undefined
            };
            
            onSelect(relayPoint);
          },
          
          // Callback de chargement
          OnWidgetLoad: function() {
            console.log('✅ Widget Mondial Relay chargé avec succès');
          },
          
          // Callback d'erreur
          OnError: function(error: any) {
            console.error('❌ Erreur widget Mondial Relay:', error);
          }
        });

        isInitialized.current = true;
        console.log('✅ Widget Mondial Relay initialisé');

      } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation du widget:', error);
      }
    };

    initializeWidget();

    // Cleanup
    return () => {
      if (widgetRef.current && window.$) {
        try {
          window.$(widgetRef.current).empty();
        } catch (error) {
          console.warn('Erreur lors du nettoyage du widget:', error);
        }
      }
      isInitialized.current = false;
    };
  }, [onSelect]);

  return (
    <div className="space-y-4">
      {/* Affichage du point relais sélectionné */}
      {selectedPoint && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-green-900">{selectedPoint.name}</div>
              <div className="text-sm text-green-700">
                {selectedPoint.address}, {selectedPoint.city} {selectedPoint.postalCode}
              </div>
              {selectedPoint.distance && (
                <div className="text-xs text-green-600">📍 À {selectedPoint.distance}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Titre de la section */}
      <div className="flex items-center space-x-2 mb-4">
        <MapPin className="w-5 h-5 text-gray-600" />
        <h4 className="font-medium text-gray-900">
          Sélectionnez votre point relais Mondial Relay
        </h4>
      </div>

      {/* Widget Mondial Relay intégré */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Styles CSS pour rendre le widget responsive */}
        <style>{`
          /* Styles pour le widget Mondial Relay responsive */
          #Zone_Widget {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: auto !important;
          }
          
          /* Container principal du widget */
          #Zone_Widget > div {
            min-width: 100% !important;
            max-width: 100% !important;
          }
          
          /* Responsive pour mobile */
          @media (max-width: 768px) {
            #Zone_Widget {
              font-size: 14px !important;
            }
            
            /* Champs de recherche personnalisés */
            #Zone_Widget input[type="text"] {
              font-size: 14px !important;
              padding: 8px !important;
              width: 50% !important;
              max-width: 100% !important;
              margin: 15px;
            }
            
            /* Tableau des points relais */
            #Zone_Widget table {
              width: 100% !important;
              font-size: 12px !important;
            }
            
            #Zone_Widget table td,
            #Zone_Widget table th {
              padding: 4px 2px !important;
              font-size: 11px !important;
              word-wrap: break-word !important;
              max-width: 120px !important;
            }
            
            /* Boutons du widget */
            #Zone_Widget input[type="button"],
            #Zone_Widget button {
              font-size: 12px !important;
              padding: 6px 8px !important;
              min-width: auto !important;
            }
            
            /* Container de la carte si présente */
            #Zone_Widget .leaflet-container {
              height: 250px !important;
              width: 100% !important;
            }
            
            /* Ajustements pour les colonnes du tableau */
            #Zone_Widget table tr td:nth-child(1) { /* Nom du point relais */
              max-width: 100px !important;
            }
            
            #Zone_Widget table tr td:nth-child(2) { /* Adresse */
              max-width: 80px !important;
            }
            
            #Zone_Widget table tr td:nth-child(3) { /* Distance */
              max-width: 50px !important;
            }
            
            #Zone_Widget table tr td:nth-child(4) { /* Bouton sélection */
              max-width: 60px !important;
            }
          }
          
          /* Responsive pour très petits écrans */
          @media (max-width: 480px) {
            #Zone_Widget {
              font-size: 12px !important;
            }
            
            #Zone_Widget table {
              font-size: 10px !important;
            }
            
            #Zone_Widget table td,
            #Zone_Widget table th {
              padding: 2px 1px !important;
              font-size: 10px !important;
              max-width: 80px !important;
            }
            
            /* Masquer certaines colonnes sur très petits écrans */
            #Zone_Widget table tr td:nth-child(3),
            #Zone_Widget table tr th:nth-child(3) {
              display: none !important; /* Masquer la colonne distance */
            }
          }
          
          /* Styles généraux pour améliorer l'apparence */
          #Zone_Widget {
            background: white !important;
            border-radius: 8px !important;
          }
          
          #Zone_Widget table {
            border-collapse: collapse !important;
          }
          
          #Zone_Widget table td {
            border-bottom: 1px solid #e5e7eb !important;
          }
          
          #Zone_Widget input[type="button"]:hover,
          #Zone_Widget button:hover {
            background-color: #8b6b5a !important;
            color: white !important;
          }
        `}</style>
        
        <div 
          ref={widgetRef}
          id="Zone_Widget" 
          className="min-h-[400px] w-full overflow-x-auto"
        />
      </div>

      {/* Champ caché pour stocker la sélection */}
      <input 
        ref={targetRef}
        type="hidden" 
        id="Target_Widget" 
        name="ParcelShopCode" 
      />
    </div>
  );
};