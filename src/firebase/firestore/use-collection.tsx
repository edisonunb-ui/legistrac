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
  const queryKey = useRef<string | null>(null);

  useEffect(() => {
    if (!query) {
      setData([]);
      queryKey.current = null;
      return;
    }

    const currentKey = JSON.stringify((query as any)._query || query.toString());
    
    // Se a query for logicamente a mesma, não reinicia o listener
    if (queryKey.current === currentKey) return;
    
    queryKey.current = currentKey;
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
        // Silenciamos permissões negadas comuns durante o desenvolvimento
        if (err.code !== 'permission-denied') {
          console.warn("Firestore Sync:", err.code);
        }
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}