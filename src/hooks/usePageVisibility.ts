import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface PageVisibilityState {
  isVisible: boolean;
  hasLeftPage: boolean;
  lastVisibilityChange: number;
  lastLocation: string;
}

export const usePageVisibility = () => {
  const location = useLocation();
  
  const [state, setState] = useState<PageVisibilityState>({
    isVisible: !document.hidden,
    hasLeftPage: false,
    lastVisibilityChange: Date.now(),
    lastLocation: location.pathname + location.search,
  });

  // Sauvegarder la localisation actuelle dans le localStorage
  useEffect(() => {
    const currentPath = location.pathname + location.search;
    localStorage.setItem('cocolive-last-location', currentPath);
    
    setState(prevState => ({
      ...prevState,
      lastLocation: currentPath,
    }));
  }, [location]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isCurrentlyVisible = !document.hidden;
      const now = Date.now();

      setState(prevState => {
        // Si la page devient visible et qu'on l'avait quittée
        if (isCurrentlyVisible && !prevState.isVisible && prevState.hasLeftPage) {
          console.log('👋 Utilisateur de retour - rechargement automatique avec conservation de la page');
          
          // Récupérer la dernière localisation sauvegardée
          const savedLocation = localStorage.getItem('cocolive-last-location');
          const currentLocation = window.location.pathname + window.location.search;
          
          console.log('📍 Localisation actuelle:', currentLocation);
          console.log('📍 Localisation sauvegardée:', savedLocation);
          
          // Rechargement automatique de la page
          setTimeout(() => {
            if (savedLocation && savedLocation !== currentLocation) {
              console.log('🎯 Redirection vers la page sauvegardée:', savedLocation);
              window.location.href = savedLocation;
            } else {
              console.log('🔄 Rechargement de la page actuelle');
              window.location.reload();
            }
          }, 100); // Petit délai pour éviter les conflits

          return {
            isVisible: true,
            hasLeftPage: false,
            lastVisibilityChange: now,
            lastLocation: prevState.lastLocation,
          };
        }
        
        // Si la page devient invisible
        if (!isCurrentlyVisible && prevState.isVisible) {
          console.log('👋 Utilisateur a quitté la plateforme depuis:', prevState.lastLocation);
          return {
            isVisible: false,
            hasLeftPage: true,
            lastVisibilityChange: now,
            lastLocation: prevState.lastLocation,
          };
        }

        // Autres cas
        return {
          ...prevState,
          isVisible: isCurrentlyVisible,
          lastVisibilityChange: now,
        };
      });
    };

    const handleWindowFocus = () => {
      // Détecter aussi le focus de la fenêtre
      if (state.hasLeftPage) {
        console.log('🎯 Focus détecté après avoir quitté la page - rechargement automatique avec conservation');
        
        // Récupérer la dernière localisation sauvegardée
        const savedLocation = localStorage.getItem('cocolive-last-location');
        const currentLocation = window.location.pathname + window.location.search;
        
        // Rechargement automatique de la page
        setTimeout(() => {
          if (savedLocation && savedLocation !== currentLocation) {
            console.log('🎯 Redirection vers la page sauvegardée via focus:', savedLocation);
            window.location.href = savedLocation;
          } else {
            console.log('🔄 Rechargement de la page actuelle via focus');
            window.location.reload();
          }
        }, 100);

        setState(prevState => ({
          ...prevState,
          hasLeftPage: false,
        }));
      }
    };

    // Écouter les changements de visibilité
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [state.hasLeftPage]);

  // Nettoyer le localStorage au démontage du composant principal
  useEffect(() => {
    return () => {
      // Ne pas nettoyer ici car on veut garder la localisation pour le retour
    };
  }, []);

  return {
    ...state,
  };
};