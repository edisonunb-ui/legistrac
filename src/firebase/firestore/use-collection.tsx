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
  
  const lastSerializedData = useRef<string | null>(null);
  const lastQueryKey = useRef<string | null>(null);

  useEffect(() => {
    // Gerar uma chave única para a query baseada no seu estado interno se possível
    // Aqui usamos uma técnica simples de estabilização
    if (!query) {
      if (lastQueryKey.current !== null) {
        setData([]);
        setLoading(false);
        setError(null);
        lastQueryKey.current = null;
        lastSerializedData.current = null;
      }
      return;
    }

    // Prevenção de loop: não reinicia se a query for "logicamente" a mesma
    // O Firebase SDK não provê uma string de query estável facilmente no client
    // então confiamos no uso de useMemoFirebase no componente pai.
    
    setLoading(true);

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
        setError(null);
      },
      (err) => {
        console.error("Firestore useCollection error:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}
