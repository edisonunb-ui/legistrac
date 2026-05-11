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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FirestoreError | null>(null);
  
  // Referência estável para a query baseada no seu conteúdo stringificado
  // Isso interrompe o loop infinito de re-renders
  const lastQueryKey = useRef<string | null>(null);

  useEffect(() => {
    if (!query) {
      setData([]);
      lastQueryKey.current = null;
      return;
    }

    // Criamos uma chave única para a query para evitar loops
    const currentQueryKey = JSON.stringify((query as any)._query || query.toString());
    
    if (lastQueryKey.current === currentQueryKey) {
      return;
    }
    
    lastQueryKey.current = currentQueryKey;
    setLoading(true);

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        } as T & { id: string }));
        
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (err.code !== 'permission-denied') {
          console.error("Firestore Error:", err);
        }
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}