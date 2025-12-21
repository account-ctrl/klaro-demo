
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useFirebase } from '@/firebase';

export interface AIAnalysisResult {
    summary: string;
    conflicts: string[];
    suggestions: string[];
    legalBasis: string[];
}

export const useOrdinanceAI = () => {
    const { firebaseApp } = useFirebase();
    const functions = getFunctions(firebaseApp, 'asia-east1'); // Ensure region matches

    const analyzeOrdinance = async (text: string): Promise<AIAnalysisResult> => {
        try {
            // Check if we are in a dev environment with no functions emulator
            // Fallback to a mock response if needed for UI testing without backend
            if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_USE_EMULATOR) {
                console.warn("Using mock AI analysis in development");
                return new Promise(resolve => setTimeout(() => resolve({
                    summary: "This is a mock summary of the ordinance. It appears to focus on public safety.",
                    conflicts: ["Potential conflict with existing Curfew Ordinance #2023-005."],
                    suggestions: ["Clarify the definition of 'minor' in Section 2.", "Add a penalty clause for second offenses."],
                    legalBasis: ["Local Government Code Section 16", "Republic Act 9344"]
                }), 2000));
            }

            const callable = httpsCallable<{ text: string }, AIAnalysisResult>(functions, 'analyzeOrdinance');
            const result = await callable({ text });
            return result.data;
        } catch (error) {
            console.error("AI Analysis Failed:", error);
            throw error;
        }
    };

    const generateDraft = async (topic: string, type: string): Promise<string> => {
        // Placeholder for generation function
        return `DRAFT ORDINANCE\n\nTITLE: AN ORDINANCE REGULATING ${topic.toUpperCase()}\n\nWHEREAS, the Sangguniang Barangay...\n\nSECTION 1. TITLE...`;
    };

    return { analyzeOrdinance, generateDraft };
};
