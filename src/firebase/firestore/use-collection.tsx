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
  
  const lastSerializedData = useRef<string>('');
  const activeQueryHash = useRef<string | null>(null);

  useEffect(() => {
    if (!query) {
      if (data.length > 0) setData([]);
      return;
    }

    // Geramos um hash simples da query para evitar reconexões se a query for logicamente a mesma
    const currentHash = JSON.stringify((query as any)._query || query.toString());
    if (activeQueryHash.current === currentHash) return;
    activeQueryHash.current = currentHash;
    
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

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}
