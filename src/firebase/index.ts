
"use client";

import { useEffect, useState } from "react";
import { 
  onSnapshot, 
  Query, 
  DocumentReference,
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

/**
 * Custom hook to get the current authenticated user.
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading };
}

/**
 * Hook to access the Firestore instance.
 */
export function useFirestore() {
  return db;
}

/**
 * Hook to access the Auth instance.
 */
export function useAuthInstance() {
  return auth;
}

/**
 * Hook to listen to a single document in Firestore.
 */
export function useDoc<T = DocumentData>(ref: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(ref, 
      (docSnap: DocumentSnapshot<T>) => {
        if (docSnap.exists()) {
          setData({ ...docSnap.data() as T, id: docSnap.id } as T);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [ref]);

  return { data, loading, error };
}

/**
 * Hook to listen to a collection or query in Firestore.
 */
export function useCollection<T = DocumentData>(q: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!q) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, 
      (querySnapshot: QuerySnapshot<T>) => {
        const docs: T[] = [];
        querySnapshot.forEach((doc) => {
          docs.push({ ...doc.data() as T, id: doc.id });
        });
        setData(docs);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [q]);

  return { data, loading, error };
}
