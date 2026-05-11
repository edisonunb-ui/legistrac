'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  DocumentReference, 
  onSnapshot, 
  DocumentSnapshot, 
  DocumentData,
  FirestoreError
} from 'firebase/firestore';

export function useDoc<T = DocumentData>(ref: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<FirestoreError | null>(null);
  
  const lastSerializedData = useRef<string | null>(null);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const currentPath = ref?.path || null;

    if (!ref || !currentPath) {
      if (lastPath.current !== null) {
        setData(null);
        setLoading(false);
        setError(null);
        lastPath.current = null;
        lastSerializedData.current = null;
      }
      return;
    }

    if (currentPath === lastPath.current) return;
    lastPath.current = currentPath;
    setLoading(true);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot: DocumentSnapshot<T>) => {
        const docData = snapshot.exists() 
          ? ({ ...snapshot.data()!, id: snapshot.id } as T & { id: string }) 
          : null;
        
        const serialized = JSON.stringify(docData);
        if (serialized !== lastSerializedData.current) {
          setData(docData);
          lastSerializedData.current = serialized;
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, loading, error };
}