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
  
  const lastQueryId = useRef<string | null>(null);

  useEffect(() => {
    // Se a query for nula, limpamos os dados e paramos
    if (!query) {
      setData([]);
      lastQueryId.current = null;
      return;
    }

    // Geramos um ID estável para a query. toString() no Firestore é confiável.
    const currentQueryId = query.toString();
    
    // Se a query for a mesma da última execução, não fazemos nada (evita loop)
    if (currentQueryId === lastQueryId.current) return;
    
    lastQueryId.current = currentQueryId;
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
        console.warn("Firestore collection sync error:", err.code);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}
