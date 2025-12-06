'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
  collection,
  doc
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

/**
 * Helper to strip custom properties (like __memo) from a CollectionReference
 * by reconstructing a clean reference.
 */
function getCleanColRef(ref: CollectionReference): CollectionReference {
  // Check if the reference is "poisoned" with custom properties
  if ((ref as any).__memo) {
    return collection(ref.firestore, ref.path);
  }
  return ref;
}

/**
 * Helper to strip custom properties (like __memo) from a DocumentReference
 * by reconstructing a clean reference.
 */
function getCleanDocRef(ref: DocumentReference): DocumentReference {
  if ((ref as any).__memo) {
    return doc(ref.firestore, ref.path);
  }
  return ref;
}

/**
 * Initiates a setDoc operation for a document reference.
 * Returns the Promise so the caller can await it if desired.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions) {
  const cleanRef = getCleanDocRef(docRef);
  return setDoc(cleanRef, data, { merge: true }).catch(error => {
    console.error("Firestore setDoc failed:", error);
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'write', // or 'create'/'update' based on options
        requestResourceData: data,
      })
    );
    throw error; // Re-throw so the caller knows it failed
  });
}


/**
 * Initiates an addDoc operation for a collection reference.
 * Returns the Promise for the new doc ref.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any) {
  const cleanRef = getCleanColRef(colRef);
  return addDoc(cleanRef, data)
    .catch(error => {
      console.error("Firestore addDoc failed:", error);
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: colRef.path,
          operation: 'create',
          requestResourceData: data,
        })
      );
      throw error;
    });
}


/**
 * Initiates an updateDoc operation for a document reference.
 * Returns the Promise.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  const cleanRef = getCleanDocRef(docRef);
  return updateDoc(cleanRef, data)
    .catch(error => {
      console.error("Firestore updateDoc failed:", error);
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'update',
          requestResourceData: data,
        })
      );
      throw error;
    });
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * Returns the Promise.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  const cleanRef = getCleanDocRef(docRef);
  return deleteDoc(cleanRef)
    .catch(error => {
      console.error("Firestore deleteDoc failed:", error);
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        })
      );
      throw error;
    });
}
