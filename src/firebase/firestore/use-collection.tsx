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
  
  const lastSerializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!query) {
      if (lastSerializedRef.current !== null) {
        setData([]);
        setLoading(false);
        setError(null);
        lastSerializedRef.current = null;
      }
      return;
    }

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<T>) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        } as T & { id: string }));
        
        const serialized = JSON.stringify(items);
        if (serialized !== lastSerializedRef.current) {
          setData(items);
          lastSerializedRef.current = serialized;
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Firestore useCollection error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}
