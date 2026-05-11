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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  
  // Usamos um ref para rastrear a consulta atual e evitar re-assinaturas desnecessárias
  // Já que objetos de Query do Firebase mudam a referência frequentemente
  const queryRef = useRef<string | null>(null);
  const queryString = query ? JSON.stringify((query as any)._query || query) : null;

  useEffect(() => {
    if (!query) {
      setData([]);
      setLoading(false);
      return;
    }

    // Se a consulta (em string) for a mesma, não reiniciamos o listener
    if (queryRef.current === queryString) {
      return;
    }
    
    queryRef.current = queryString;
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
      },
      (err) => {
        console.error('Error fetching collection:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      queryRef.current = null;
    };
  }, [query, queryString]);

  return { data, loading, error };
}
