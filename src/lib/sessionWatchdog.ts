import { supabase } from './supabase';

export interface SessionState {
  isReady: boolean;
  isRefreshing: boolean;
  lastCheck: number;
  retryCount: number;
}

class SessionWatchdog {
  private state: SessionState = {
    isReady: false,
    isRefreshing: false,
    lastCheck: 0,
    retryCount: 0,
  };

  private listeners: Set<(state: SessionState) => void> = new Set();
  private pendingOperations: Set<string> = new Set();
  private operationQueue: Map<string, () => Promise<any>> = new Map();
  private lastOperation: string | null = null;

  constructor() {
    this.setupEventListeners();
    this.initialize();
  }

  private setupEventListeners() {
    // Écouter les changements de visibilité
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Écouter le focus de la fenêtre
    window.addEventListener('focus', this.handleWindowFocus.bind(this));
    
    // Écouter les changements d'état d'authentification
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state change detected:', event);
      if (event === 'SIGNED_OUT') {
        this.state.isReady = false;
        this.notifyListeners();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        this.state.isReady = true;
        this.state.lastCheck = Date.now();
        this.notifyListeners();
      }
    });
  }

  private async handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      console.log('👁️ Page became visible, checking session...');
      await this.checkAndRefreshSession();
    }
  }

  private async handleWindowFocus() {
    console.log('🎯 Window focused, checking session...');
    await this.checkAndRefreshSession();
  }

  private async initialize() {
    console.log('🚀 Initializing session watchdog...');
    // Vérification en arrière-plan pour ne pas bloquer l'UI
    this.checkAndRefreshSession().catch(error => {
      console.warn('Initial session check failed (non-blocking):', error);
    });
  }

  public async checkAndRefreshSession(): Promise<boolean> {
    // Éviter les vérifications multiples simultanées
    if (this.state.isRefreshing) {
      console.log('⚠️ Session check already in progress, skipping...');
      return this.state.isReady;
    }

    this.state.isRefreshing = true;
    this.state.isReady = false;
    this.notifyListeners();

    try {
      console.log('🔍 Checking session validity...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Session check error:', error);
        
        // Essayer de rafraîchir la session
        console.log('🔄 Attempting session refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ Session refresh failed:', refreshError);
          this.state.isReady = false;
          this.state.retryCount++;
          return false;
        }
        
        if (refreshData.session) {
          console.log('✅ Session refreshed successfully');
          this.state.isReady = true;
          this.state.lastCheck = Date.now();
          this.state.retryCount = 0;
          return true;
        }
        
        return false;
      }
      
      if (!session) {
        console.warn('⚠️ No session found');
        this.state.isReady = false;
        return false;
      }
      
      // Vérifier si le token expire bientôt (dans les 10 prochaines minutes)
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;
      
      if (timeUntilExpiry < 600) { // 10 minutes
        console.log(`🔄 Token expires in ${Math.floor(timeUntilExpiry / 60)} minutes, refreshing...`);
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('❌ Failed to refresh session:', refreshError);
          this.state.isReady = timeUntilExpiry > 60; // Garder actif si plus d'1 minute
          return this.state.isReady;
        }
        
        if (data.session) {
          console.log('✅ Session refreshed successfully');
          this.state.isReady = true;
          this.state.lastCheck = Date.now();
          this.state.retryCount = 0;
          return true;
        }
      }

      console.log(`✅ Valid session found, expires in ${Math.floor(timeUntilExpiry / 60)} minutes`);
      this.state.isReady = true;
      this.state.lastCheck = Date.now();
      this.state.retryCount = 0;
      return true;
      
    } catch (error) {
      console.error('❌ Error during session check:', error);
      this.state.isReady = false;
      this.state.retryCount++;
      return false;
    } finally {
      this.state.isRefreshing = false;
      this.notifyListeners();
      
      // Traiter la queue d'opérations en attente
      if (this.state.isReady) {
        await this.processOperationQueue();
      }
    }
  }

  private async processOperationQueue() {
    console.log('🔄 Processing operation queue...');
    
    // Traiter seulement la dernière opération (stratégie dernière opération gagnante)
    if (this.lastOperation && this.operationQueue.has(this.lastOperation)) {
      const operation = this.operationQueue.get(this.lastOperation);
      this.operationQueue.clear();
      
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('❌ Error processing queued operation:', error);
        }
      }
    }
  }

  public subscribe(listener: (state: SessionState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  public isSessionReady(): boolean {
    return this.state.isReady && !this.state.isRefreshing;
  }

  public async waitForSession(timeout = 10000): Promise<boolean> {
    if (this.isSessionReady()) {
      return true;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeout);

      const unsubscribe = this.subscribe((state) => {
        if (state.isReady && !state.isRefreshing) {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }

  public queueOperation(operationId: string, operation: () => Promise<any>) {
    this.lastOperation = operationId;
    this.operationQueue.set(operationId, operation);
  }

  public isOperationPending(operationId: string): boolean {
    return this.pendingOperations.has(operationId);
  }

  public markOperationStart(operationId: string) {
    this.pendingOperations.add(operationId);
  }

  public markOperationEnd(operationId: string) {
    this.pendingOperations.delete(operationId);
  }
}

// Instance singleton
export const sessionWatchdog = new SessionWatchdog();

import { useEffect, useState } from 'react';

// Hook pour utiliser le watchdog dans les composants React
export const useSessionWatchdog = () => {
  const [state, setState] = useState<SessionState>(sessionWatchdog['state']);

  useEffect(() => {
    return sessionWatchdog.subscribe(setState);
  }, []);

  return {
    ...state,
    isSessionReady: sessionWatchdog.isSessionReady(),
    waitForSession: sessionWatchdog.waitForSession.bind(sessionWatchdog),
    queueOperation: sessionWatchdog.queueOperation.bind(sessionWatchdog),
    isOperationPending: sessionWatchdog.isOperationPending.bind(sessionWatchdog),
  };
};