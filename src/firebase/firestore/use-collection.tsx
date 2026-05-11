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
  
  // Usamos uma referência para o hash da consulta para evitar loops infinitos
  const queryHash = useRef<string | null>(null);

  useEffect(() => {
    if (!query) {
      setData([]);
      queryHash.current = null;
      return;
    }

    // Criamos uma "assinatura" da consulta para comparar se ela mudou de fato
    const currentHash = JSON.stringify((query as any)._query || query.toString());
    if (currentHash === queryHash.current) return;
    
    queryHash.current = currentHash;
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
        console.warn("Firestore Sync Error:", err.code);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}
