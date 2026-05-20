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

    // Estabilização de Query para evitar loops de re-render
    const currentQueryKey = (query as any)._query?.path?.toString() + (query as any)._query?.filters?.length;
    
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
          console.error("Firestore Collection Error:", err);
        }
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}
