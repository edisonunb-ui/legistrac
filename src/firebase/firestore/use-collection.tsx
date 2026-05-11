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
  
  // Usamos refs para rastrear a versão estável dos dados e evitar loops
  const lastSerializedData = useRef<string>('');
  const activeQueryRef = useRef<Query<T> | null>(null);

  useEffect(() => {
    if (!query) {
      setData([]);
      setLoading(false);
      return;
    }

    // Se a query for a mesma referência (estabilizada com useMemoFirebase), não reiniciamos
    if (activeQueryRef.current === query) return;
    activeQueryRef.current = query;
    
    setLoading(true);

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        } as T & { id: string }));
        
        const serialized = JSON.stringify(items);
        // Só atualiza o estado se os dados realmente mudarem
        if (serialized !== lastSerializedData.current) {
          lastSerializedData.current = serialized;
          setData(items);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Firestore useCollection error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      activeQueryRef.current = null;
    };
  }, [query]);

  return { data, loading, error };
}
