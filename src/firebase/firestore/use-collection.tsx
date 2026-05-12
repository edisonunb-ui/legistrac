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
  
  const lastQueryKey = useRef<string | null>(null);

  useEffect(() => {
    if (!query) {
      setData([]);
      lastQueryKey.current = null;
      setLoading(false);
      return;
    }

    // Gerar uma chave de query estável sem usar JSON.stringify no objeto circular
    const currentQueryKey = (query as any)._query?.path?.toString() || Math.random().toString();
    
    if (lastQueryKey.current === currentQueryKey && data.length > 0) {
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
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}
