
import { query, where, collection, QueryConstraint, CollectionReference, DocumentData } from "firebase/firestore";
import { Resident, Household } from "@/lib/types";

export interface DemographicFilter {
    ageRange?: { min: number; max: number };
    isPwd?: boolean;
    is4ps?: boolean;
    mobility?: 'ambulant' | 'wheelchair' | 'bedridden';
    medicalDependency?: string[];
    purokId?: string;
}

/**
 * MODULE 2.1: COMPOUND FILTERING LOGIC
 * Constructs a dynamic Firestore query based on stacked filters.
 * Note: Compound queries on different fields require composite indexes in firestore.indexes.json
 */
export function buildDemographicQuery(
    baseCollection: CollectionReference<DocumentData>,
    filters: DemographicFilter
) {
    const constraints: QueryConstraint[] = [];

    // Demographic Flags
    if (filters.isPwd !== undefined) {
        constraints.push(where("vulnerability_details.isPwd", "==", filters.isPwd));
    }
    
    if (filters.is4ps !== undefined) {
        constraints.push(where("vulnerability_details.is4ps", "==", filters.is4ps));
    }

    // Mobility State
    if (filters.mobility) {
        constraints.push(where("vulnerability_details.mobility", "==", filters.mobility));
    }

    // Geographic Scope
    if (filters.purokId) {
        constraints.push(where("purokId", "==", filters.purokId));
    }

    // Medical Dependency (Array Contains)
    if (filters.medicalDependency && filters.medicalDependency.length > 0) {
        // Firestore limitation: only one 'array-contains' or 'array-contains-any' allowed per query
        constraints.push(where("vulnerability_details.medical_dependency", "array-contains-any", filters.medicalDependency));
    }

    return query(baseCollection, ...constraints);
}

/**
 * CLIENT-SIDE DATA ENRICHMENT
 * Some filters (like dynamic age calculation) are better handled in-memory
 * to avoid excessive Firestore indexing for non-static fields.
 */
export function enrichAndFilterHouseholds(
    households: Household[], 
    residents: Resident[],
    filters: DemographicFilter
) {
    // 1. Create a map of vulnerability stats per household
    const householdStats = new Map<string, any>();

    residents.forEach(r => {
        if (!r.householdId) return;
        
        const current = householdStats.get(r.householdId) || {
            seniors: 0,
            pwds: 0,
            dependentCount: 0,
            members: []
        };

        const age = r.dateOfBirth ? new Date().getFullYear() - new Date(r.dateOfBirth).getFullYear() : 0;
        if (age >= 60) current.seniors++;
        if (r.isPwd) current.pwds++;
        
        current.members.push(r);
        householdStats.set(r.householdId, current);
    });

    // 2. Filter Households based on enriched data
    return households.filter(h => {
        const stats = householdStats.get(h.householdId);
        if (!stats) return false;

        let match = true;

        if (filters.ageRange) {
            const hasMemberInAgeRange = stats.members.some((m: Resident) => {
                const age = m.dateOfBirth ? new Date().getFullYear() - new Date(m.dateOfBirth).getFullYear() : 0;
                return age >= filters.ageRange!.min && age <= filters.ageRange!.max;
            });
            if (!hasMemberInAgeRange) match = false;
        }

        if (filters.isPwd && stats.pwds === 0) match = false;
        if (filters.purokId && h.purokId !== filters.purokId) match = false;

        return match;
    });
}
