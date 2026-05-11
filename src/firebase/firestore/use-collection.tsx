
'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  Query, 
  onSnapshot, 
  QuerySnapshot, 
  DocumentData,
  FirestoreError
} from 'firebase/firestore';

export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(!!query);
  const [error, setError] = useState<FirestoreError | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastQueryRef = useRef<Query<T> | null>(null);

  useEffect(() => {
    // Se não houver query, reseta o estado apenas se necessário
    if (!query) {
      setData(prev => prev.length === 0 ? prev : []);
      setLoading(prev => !prev ? prev : false);
      lastQueryRef.current = null;
      return;
    }

    // Compara a referência da query para evitar re-assinaturas desnecessárias
    if (lastQueryRef.current === query) {
      return;
    }

    // Limpa assinatura anterior
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    lastQueryRef.current = query;
    // Só define como loading se já não estiver
    setLoading(prev => prev ? prev : true);

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        } as T & { id: string }));
        
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching collection:', err);
        setError(err);
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [query]);

  return { data, loading, error };
}
