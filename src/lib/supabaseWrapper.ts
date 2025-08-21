import { supabase } from './supabase';
import { sessionWatchdog } from './sessionWatchdog';

interface RequestOptions {
  retryOnAuth?: boolean;
  operationId?: string;
  skipSessionCheck?: boolean;
}

interface MutationResult<T> {
  data: T | null;
  error: any;
  count?: number;
}

class SupabaseWrapper {
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async executeWithRetry<T>(
    operation: () => Promise<any>,
    options: RequestOptions = {}
  ): Promise<MutationResult<T>> {
    const { retryOnAuth = true, operationId, skipSessionCheck = false } = options;
    const opId = operationId || this.generateOperationId();

    // Empêcher le double-clic
    if (sessionWatchdog.isOperationPending(opId)) {
      console.log('⚠️ Operation already pending, ignoring duplicate:', opId);
      return { data: null, error: new Error('Operation already in progress') };
    }

    sessionWatchdog.markOperationStart(opId);

    try {
      // Vérifier la session si nécessaire
      if (!skipSessionCheck && !sessionWatchdog.isSessionReady()) {
        console.log('⏳ Waiting for session to be ready...');
        const sessionReady = await sessionWatchdog.waitForSession();
        
        if (!sessionReady) {
          throw new Error('Session not available');
        }
      }

      // Première tentative
      console.log('📡 Executing operation:', opId);
      let result = await operation();

      // Vérifier si c'est une erreur d'authentification
      if (result.error && retryOnAuth) {
        const isAuthError = result.error.code === 'PGRST301' || 
                           result.error.message?.includes('JWT') ||
                           result.error.message?.includes('401') ||
                           result.error.message?.includes('403');

        if (isAuthError) {
          console.log('🔄 Auth error detected, refreshing session and retrying...');
          
          // Forcer la vérification de session
          await sessionWatchdog.checkAndRefreshSession();
          
          if (sessionWatchdog.isSessionReady()) {
            console.log('🔄 Retrying operation after session refresh...');
            result = await operation();
          }
        }
      }

      // Traiter le cas 0 ligne explicitement
      if (result.data === null && !result.error) {
        console.log('⚠️ Operation returned 0 rows');
        return { data: null, error: null, count: 0 };
      }

      // Pour les mutations, récupérer la ligne mise à jour pour synchroniser l'UI
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        console.log('✅ Operation successful, data synchronized');
      }

      return {
        data: result.data,
        error: result.error,
        count: result.count
      };

    } catch (error) {
      console.error('❌ Operation failed:', error);
      return { data: null, error };
    } finally {
      sessionWatchdog.markOperationEnd(opId);
      console.log('🏁 Operation completed:', opId);
    }
  }

  // Wrapper pour les requêtes SELECT
  public async select<T>(
    table: string,
    query: string = '*',
    filters?: Record<string, any>,
    options: RequestOptions = {}
  ): Promise<MutationResult<T[]>> {
    return this.executeWithRetry<T[]>(async () => {
      let queryBuilder = supabase.from(table).select(query);
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (key.includes('.')) {
            // Support pour les filtres complexes comme 'orders.status'
            const [relation, field] = key.split('.');
            queryBuilder = queryBuilder.eq(`${relation}.${field}`, value);
          } else {
            queryBuilder = queryBuilder.eq(key, value);
          }
        });
      }
      
      return await queryBuilder;
    }, options);
  }

  // Wrapper pour les requêtes INSERT
  public async insert<T>(
    table: string,
    data: any,
    options: RequestOptions = {}
  ): Promise<MutationResult<T>> {
    return this.executeWithRetry<T>(async () => {
      const result = await supabase
        .from(table)
        .insert(data)
        .select()
        .single();
      
      return result;
    }, options);
  }

  // Wrapper pour les requêtes UPDATE
  public async update<T>(
    table: string,
    data: any,
    filters: Record<string, any>,
    options: RequestOptions = {}
  ): Promise<MutationResult<T>> {
    return this.executeWithRetry<T>(async () => {
      let queryBuilder = supabase.from(table).update(data);
      
      Object.entries(filters).forEach(([key, value]) => {
        queryBuilder = queryBuilder.eq(key, value);
      });
      
      const result = await queryBuilder.select().single();
      
      // Traiter explicitement le cas 0 ligne
      if (!result.data && !result.error) {
        return { data: null, error: new Error('No rows updated'), count: 0 };
      }
      
      return result;
    }, options);
  }

  // Wrapper pour les requêtes DELETE
  public async delete<T>(
    table: string,
    filters: Record<string, any>,
    options: RequestOptions = {}
  ): Promise<MutationResult<T>> {
    return this.executeWithRetry<T>(async () => {
      let queryBuilder = supabase.from(table).delete();
      
      Object.entries(filters).forEach(([key, value]) => {
        queryBuilder = queryBuilder.eq(key, value);
      });
      
      return await queryBuilder;
    }, options);
  }

  // Wrapper pour les requêtes UPSERT
  public async upsert<T>(
    table: string,
    data: any,
    options: RequestOptions & { onConflict?: string } = {}
  ): Promise<MutationResult<T>> {
    const { onConflict, ...requestOptions } = options;
    
    return this.executeWithRetry<T>(async () => {
      let queryBuilder = supabase.from(table).upsert(data);
      
      if (onConflict) {
        queryBuilder = queryBuilder.select();
      }
      
      return await queryBuilder;
    }, requestOptions);
  }

  // Méthode pour les refetch séquencés après revalidation
  public async sequencedRefetch(operations: Array<{ id: string; operation: () => Promise<any> }>) {
    console.log('🔄 Starting sequenced refetch after auth revalidation...');
    
    // Attendre que la session soit prête
    const sessionReady = await sessionWatchdog.waitForSession();
    if (!sessionReady) {
      console.error('❌ Session not ready for sequenced refetch');
      return;
    }

    // Exécuter les opérations en séquence
    for (const { id, operation } of operations) {
      try {
        console.log(`🔄 Executing sequenced operation: ${id}`);
        await operation();
        console.log(`✅ Sequenced operation completed: ${id}`);
      } catch (error) {
        console.error(`❌ Sequenced operation failed: ${id}`, error);
      }
    }
    
    console.log('✅ All sequenced operations completed');
  }

  // Getter pour l'état de la session
  public getSessionState(): SessionState {
    return { ...sessionWatchdog['state'] };
  }

  // Méthode pour forcer une vérification de session
  public async forceSessionCheck(): Promise<boolean> {
    return await sessionWatchdog.checkAndRefreshSession();
  }
}

// Instance singleton
export const supabaseWrapper = new SupabaseWrapper();

// Hook React pour utiliser le wrapper
export const useSupabaseWrapper = () => {
  return {
    select: supabaseWrapper.select.bind(supabaseWrapper),
    insert: supabaseWrapper.insert.bind(supabaseWrapper),
    update: supabaseWrapper.update.bind(supabaseWrapper),
    delete: supabaseWrapper.delete.bind(supabaseWrapper),
    upsert: supabaseWrapper.upsert.bind(supabaseWrapper),
    sequencedRefetch: supabaseWrapper.sequencedRefetch.bind(supabaseWrapper),
    getSessionState: supabaseWrapper.getSessionState.bind(supabaseWrapper),
    forceSessionCheck: supabaseWrapper.forceSessionCheck.bind(supabaseWrapper),
  };
};