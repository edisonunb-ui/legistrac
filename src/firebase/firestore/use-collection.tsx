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
  
  const lastSerializedData = useRef<string | null>(null);
  const lastQueryRef = useRef<Query<T> | null>(null);

  useEffect(() => {
    // Se a query for nula, reseta o estado e sai
    if (!query) {
      if (lastQueryRef.current !== null) {
        setData([]);
        setLoading(false);
        setError(null);
        lastQueryRef.current = null;
        lastSerializedData.current = null;
      }
      return;
    }

    // Evita re-inscrição se a referência da query for a mesma
    if (query === lastQueryRef.current) return;
    lastQueryRef.current = query;

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        } as T & { id: string }));
        
        const serialized = JSON.stringify(items);
        if (serialized !== lastSerializedData.current) {
          setData(items);
          lastSerializedData.current = serialized;
        }
        setLoading(false);
      },
      (err) => {
        // Só atualiza o erro se ele for diferente do atual para evitar loops
        if (error?.code !== err.code) {
          setError(err);
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [query, error?.code]);

  return { data, loading, error };
}
