import { useState, useEffect } from 'react';

interface PageVisibilityState {
  isVisible: boolean;
  hasLeftPage: boolean;
  lastVisibilityChange: number;
}

export const usePageVisibility = () => {
  const [state, setState] = useState<PageVisibilityState>({
    isVisible: !document.hidden,
    hasLeftPage: false,
    lastVisibilityChange: Date.now(),
  });

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isCurrentlyVisible = !document.hidden;
      const now = Date.now();

      setState(prevState => {
        // Si la page devient visible et qu'on l'avait quittée
        if (isCurrentlyVisible && !prevState.isVisible && prevState.hasLeftPage) {
          console.log('👋 Utilisateur de retour - rechargement automatique de la page');
          
          // Rechargement automatique de la page
          setTimeout(() => {
            window.location.reload();
          }, 100); // Petit délai pour éviter les conflits

          return {
            isVisible: true,
            hasLeftPage: false,
            lastVisibilityChange: now,
          };
        }
        
        // Si la page devient invisible
        if (!isCurrentlyVisible && prevState.isVisible) {
          console.log('👋 Utilisateur a quitté la plateforme');
          return {
            isVisible: false,
            hasLeftPage: true,
            lastVisibilityChange: now,
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
        console.log('🎯 Focus détecté après avoir quitté la page - rechargement automatique');
        
        // Rechargement automatique de la page
        setTimeout(() => {
          window.location.reload();
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

  return {
    ...state,
  };
};