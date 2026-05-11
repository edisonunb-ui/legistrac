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
  
  // Usamos um ID estável para evitar loops infinitos de renderização
  const lastQueryKey = useRef<string | null>(null);

  useEffect(() => {
    if (!query) {
      setData([]);
      lastQueryKey.current = null;
      return;
    }

    const currentKey = query.toString();
    if (currentKey === lastQueryKey.current) return;
    
    lastQueryKey.current = currentKey;
    setLoading(true);

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        } as T & { id: string }));
        
        // Só atualiza se houver mudança real para evitar loops
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        // Erros de permissão são tratados silenciosamente para não travar a UI
        console.warn("Firestore Sync Warning:", err.code);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}
