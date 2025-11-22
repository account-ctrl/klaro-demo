
import type { BlotterCase } from "@/lib/types";

type CaseTypeOption = {
    label: string;
    value: string;
    severity: BlotterCase['severity'];
    description: string;
}

type CaseTypeGroups = {
    criminal: CaseTypeOption[];
    civil: CaseTypeOption[];
    admin: CaseTypeOption[];
    referral: CaseTypeOption[];
}

export const caseTypes: CaseTypeGroups = {
    criminal: [
        { label: "Slight Physical Injuries", value: "Slight Physical Injuries", severity: "Low", description: "Minor injuries (bruises, scratches) requiring medical attendance for less than 9 days." },
        { label: "Theft (Petty)", value: "Theft (Petty)", severity: "Low", description: "Taking personal property without violence or intimidation (e.g., stealing hanging laundry, localized shoplifting)." },
        { label: "Malicious Mischief", value: "Malicious Mischief", severity: "Low", description: "Deliberate destruction or damage to another person's property." },
        { label: "Oral Defamation", value: "Oral Defamation", severity: "Low", description: "Spreading lies or speaking ill of someone to damage their reputation." },
        { label: "Intrigue Against Honor", value: "Intrigue Against Honor", severity: "Low", description: "Spreading gossip (chismis) without necessarily attributing it to a source." },
        { label: "Unjust Vexation", value: "Unjust Vexation", severity: "Low", description: "Any act that annoys, irritates, or disturbs another person without physical harm." },
        { label: "Light Threats / Grave Threats", value: "Light Threats / Grave Threats", severity: "Medium", description: "Threatening to inflict harm on a person, their honor, or property." },
        { label: "Trespass to Dwelling", value: "Trespass to Dwelling", severity: "Medium", description: "Entering a private yard or house without permission." },
        { label: "Coercion", value: "Coercion", severity: "Medium", description: "Preventing someone from doing something legal, or forcing them to do something against their will." },
        { label: "Estafa (Small Scale)", value: "Estafa (Small Scale)", severity: "Medium", description: "Deceiving someone to get money or property (e.g., \"Budol-budol\" or fake transactions)." },
    ],
    civil: [
        { label: "Collection of Sum of Money", value: "Collection of Sum of Money", severity: "Low", description: "Failure to pay personal loans (\"Utang\") or debts." },
        { label: "Unlawful Detainer / Ejectment", value: "Unlawful Detainer / Ejectment", severity: "Medium", description: "Landlord trying to evict a tenant for non-payment or violation of lease." },
        { label: "Boundary Dispute", value: "Boundary Dispute", severity: "Medium", description: "Disagreement over where one's lot ends and the neighbor's begins (common with fences)." },
        { label: "Easement of Right of Way", value: "Easement of Right of Way", severity: "Medium", description: "Blocking a path or refusing passage through a property." },
        { label: "Breach of Contract", value: "Breach of Contract", severity: "Low", description: "Failure to fulfill a written or verbal agreement (e.g., construction work not finished)." },
        { label: "Support / Alimony", value: "Support / Alimony", severity: "Medium", description: "Disputes regarding financial support for children or spouses." },
        { label: "Civil Damages", value: "Civil Damages", severity: "Low", description: "Accidental damage (e.g., a car hitting a neighbor's gate) where the goal is payment for repairs." },
    ],
    admin: [
        { label: "Violation of Anti-Noise Ordinance", value: "Violation of Anti-Noise Ordinance", severity: "Admin", description: "Videoke sessions past curfew, loud parties, disturbing the peace." },
        { label: "Violation of Curfew Ordinance", value: "Violation of Curfew Ordinance", severity: "Admin", description: "Minors roaming the streets during prohibited hours." },
        { label: "Illegal Parking / Obstruction", value: "Illegal Parking / Obstruction", severity: "Admin", description: "Parking on sidewalks or blocking the road with structures." },
        { label: "Violation of Ecological Solid Waste Act", value: "Violation of Ecological Solid Waste Act", severity: "Admin", description: "Improper waste disposal, burning of garbage/leaves." },
        { label: "Violation of Loose Animal Ordinance", value: "Violation of Loose Animal Ordinance", severity: "Admin", description: "Unleashed dogs (Askals) or livestock roaming public places." },
        { label: "Violation of Liquor Ban", value: "Violation of Liquor Ban", severity: "Admin", description: "Drinking alcohol in public streets or outside designated areas." },
        { label: "Illegal Vending", value: "Illegal Vending", severity: "Admin", description: "Selling goods on sidewalks or areas without a permit." },
        { label: "Violation of Anti-Smoking Ordinance", value: "Violation of Anti-Smoking Ordinance", severity: "Admin", description: "Smoking in public places or enclosed areas." },
    ],
    referral: [
         { label: "For Police Referral / Recording Only", value: "For Police Referral / Recording Only", severity: "Referral Only", description: "Serious crimes (e.g., Murder, Rape, Drugs) that cannot be settled at the barangay level but must be logged before being turned over to the PNP." },
    ]
};
