
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc
} from 'firebase/firestore';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
  add: (data: Omit<T, 'id'>) => Promise<any>;
  update: (id: string, data: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  set: (id: string, data: T) => Promise<void>;
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    targetRefOrQuery: (CollectionReference<DocumentData> | Query<DocumentData>) | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  // Ref to track the previous query to avoid infinite loops or unnecessary re-subscriptions
  const prevQueryRef = useRef<typeof targetRefOrQuery>(undefined);

  useEffect(() => {
    // We can't rely just on object identity if memoization is not perfect.
    // However, if the user follows rules, this check prevents re-subscription
    // if the reference hasn't changed.
    if (prevQueryRef.current === targetRefOrQuery) {
      return;
    }
    prevQueryRef.current = targetRefOrQuery;

    if (!targetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      targetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        let path = 'unknown-path';
        try {
            path = targetRefOrQuery.type === 'collection'
            ? (targetRefOrQuery as CollectionReference).path
            : (targetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString()
        } catch (e) {
            // ignore
        }

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        })

        console.error("useCollection subscription error:", error);
        setError(contextualError)
        setData(null)
        setIsLoading(false)
      }
    );

    return () => unsubscribe();
  }, [targetRefOrQuery]); 
  
    // Helper functions for CRUD operations
    const add = async (newData: Omit<T, 'id'>) => {
        if (!targetRefOrQuery || targetRefOrQuery.type !== 'collection') {
            throw new Error("Cannot add to a query, must be a collection reference");
        }
        return await addDoc(targetRefOrQuery as CollectionReference<DocumentData>, newData as DocumentData);
    };

    const update = async (id: string, updatedData: Partial<T>) => {
        if (!targetRefOrQuery || targetRefOrQuery.type !== 'collection') {
             // If it's a query, we might need to get the doc ref differently or throw error
             // Ideally we shouldn't be updating from a query result directly without a collection ref context usually available
             // But assuming we have enough info or caller handles it.
             // Best practice: caller should pass collection ref if they want to use 'add'.
             // For update, we can construct the doc ref if we know the path.
             // But from a query object we can't always easily get the parent collection for a doc.
              throw new Error("Cannot update directly on query result without collection context");
        }
        const docRef = doc(targetRefOrQuery as CollectionReference<DocumentData>, id);
        await updateDoc(docRef, updatedData as DocumentData);
    };

    const remove = async (id: string) => {
        if (!targetRefOrQuery || targetRefOrQuery.type !== 'collection') {
             throw new Error("Cannot delete directly on query result without collection context");
        }
        const docRef = doc(targetRefOrQuery as CollectionReference<DocumentData>, id);
        await deleteDoc(docRef);
    };

     const set = async (id: string, newData: T) => {
        if (!targetRefOrQuery || targetRefOrQuery.type !== 'collection') {
             throw new Error("Cannot set directly on query result without collection context");
        }
        const docRef = doc(targetRefOrQuery as CollectionReference<DocumentData>, id);
        await setDoc(docRef, newData as DocumentData);
    };

  return { data, isLoading, error, add, update, remove, set };
}
