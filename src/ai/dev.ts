'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/barangay-data-insights.ts';
import '@/ai/flows/ask-barangay-data.ts';
