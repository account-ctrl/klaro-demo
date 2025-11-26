'use server';
import { config } from 'dotenv';
config();

// Import flows to register them
import '@/ai/flows/barangay-data-insights';
import '@/ai/flows/ask-barangay-data';
