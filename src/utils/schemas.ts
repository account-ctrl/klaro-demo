
import { z } from 'zod';
import { ROLES, RESIDENT_STATUS, CIVIL_STATUS, EMERGENCY_CATEGORY, EMERGENCY_STATUS } from './constants';

/**
 * Valid PH Phone Number Schema
 * Formats: 09XXXXXXXXX or +639XXXXXXXXX
 */
const phoneSchema = z.string().regex(/^(09|\+639)\d{9}$/, "Invalid PH phone number format (e.g. 09171234567)");

/**
 * User Schema (System Users / Officials)
 */
export const UserSchema = z.object({
    userId: z.string(),
    email: z.string().email(),
    fullName: z.string().min(2, "Full name is too short").transform(val => val.trim().toUpperCase()), // Auto-sanitize
    position: z.string().min(1, "Position is required"),
    systemRole: z.enum(Object.values(ROLES) as [string, ...string[]]),
    status: z.enum(['Active', 'Inactive', 'Pending']).default('Active'),
    tenantId: z.string().min(1, "Tenant ID is required"), // Critical for multi-tenancy
    contactNumber: phoneSchema.optional().or(z.literal('')),
    createdAt: z.any().optional(), // Timestamp
});

/**
 * Resident Record Schema
 * Used for civil registry
 */
export const ResidentSchema = z.object({
    firstName: z.string().min(1).transform(v => v.trim().toUpperCase()),
    lastName: z.string().min(1).transform(v => v.trim().toUpperCase()),
    middleName: z.string().optional().transform(v => v ? v.trim().toUpperCase() : ''),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid Date (YYYY-MM-DD)"),
    gender: z.enum(['Male', 'Female', 'Other']),
    civilStatus: z.enum(Object.values(CIVIL_STATUS) as [string, ...string[]]),
    address: z.string().min(5, "Address is too short"),
    status: z.enum(Object.values(RESIDENT_STATUS) as [string, ...string[]]).default(RESIDENT_STATUS.ACTIVE),
    contactNumber: phoneSchema.optional().or(z.literal('')),
    isVoter: z.boolean().default(false),
    isPwd: z.boolean().default(false),
    tenantId: z.string().min(1)
});

/**
 * Emergency Alert Schema
 * Used for SOS signals
 */
export const EmergencyAlertSchema = z.object({
    residentId: z.string(),
    residentName: z.string(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy_m: z.number().optional(),
    status: z.enum(Object.values(EMERGENCY_STATUS) as [string, ...string[]]).default(EMERGENCY_STATUS.NEW),
    category: z.enum(Object.values(EMERGENCY_CATEGORY) as [string, ...string[]]).default(EMERGENCY_CATEGORY.UNSPECIFIED),
    message: z.string().optional(),
    timestamp: z.any() // Firestore Timestamp
});

// Export Type Inferences for use in Typescript
export type UserType = z.infer<typeof UserSchema>;
export type ResidentType = z.infer<typeof ResidentSchema>;
export type EmergencyAlertType = z.infer<typeof EmergencyAlertSchema>;
