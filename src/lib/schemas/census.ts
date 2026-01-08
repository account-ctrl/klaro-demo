
import { z } from "zod";

// --- CENSUS / HEALTH EXTENSIONS ---

export const HealthProfileSchema = z.object({
  bloodType: z.string().optional(),
  lifestyleRisks: z.array(z.string()).optional(), // Smoker, Alcohol Drinker, Drug Use
  comorbidities: z.array(z.string()).optional(), // Hypertension, Diabetes, etc.
  disabilities: z.object({
    isPWD: z.boolean(),
    type: z.string().optional(),
  }).optional(),
  nutritionalStatus: z.enum(["Normal", "Underweight", "Stunted", "Overweight", "Obese"]).optional(),
  
  // Conditional Logic Groups
  reproductiveHealth: z.object({
    isPregnant: z.boolean(),
    isLactating: z.boolean(),
    familyPlanningMethod: z.string().optional(), // Pills, IUD, etc.
    hasUnmetNeed: z.boolean().optional(),
  }).optional(), // Only for Female 15-49
  
  childHealth: z.object({
    immunizations: z.array(z.string()), // BCG, Measles, etc.
    lastDeworming: z.date().optional().or(z.string().optional()), // Date or ISO string
    lastVitaminA: z.date().optional().or(z.string().optional()),
  }).optional(), // Only for 0-5
  
  seniorHealth: z.object({
    hasFluVaccine: z.boolean(),
    hasPneumoniaVaccine: z.boolean(),
  }).optional(), // Only for 60+
});

export const SocioEconomicExtension = z.object({
  educationLevel: z.enum(["None", "Elementary", "High School", "College", "Vocational"]).optional(),
  occupation: z.string().optional(),
  monthlyIncome: z.number().optional(), // For household head usually, but can be individual
  govtMemberships: z.array(z.string()).optional(), // 4Ps, PhilHealth, SSS
});

export const HouseholdInfrastructureSchema = z.object({
  housingStatus: z.enum(["Owned", "Rented", "Gratis", "Caretaker"]).optional(),
  constructionMaterial: z.enum(["Concrete", "Semi-Concrete", "Wood", "Light Material", "Makeshift"]).optional(),
  toiletFacility: z.enum(["Water-sealed", "VIP Latrine", "Open Pit", "None"]).optional(),
  waterSource: z.enum(["Level I", "Level II", "Level III", "Doubtful"]).optional(),
  electricitySource: z.enum(["Grid", "Solar", "Kerosene", "None"]).optional(),
  wasteDisposal: z.array(z.string()).optional(), // Burning, Collection, etc.
  hasSanitaryPermit: z.boolean().optional(), // For food businesses
  hasFoodBusiness: z.boolean().optional(),
});

// Helper types derived from Zod
export type HealthProfile = z.infer<typeof HealthProfileSchema>;
export type SocioEconomicProfile = z.infer<typeof SocioEconomicExtension>;
export type HouseholdInfrastructure = z.infer<typeof HouseholdInfrastructureSchema>;
