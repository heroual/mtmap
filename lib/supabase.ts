
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Safe environment access
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

// Supabase Configuration
// Credentials for 'kdwkxectaycxdayqzyrf'
const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') || 'https://kdwkxectaycxdayqzyrf.supabase.co';
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkd2t4ZWN0YXljeGRheXF6eXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2Njc3MzUsImV4cCI6MjA4NDI0MzczNX0.E30Nm06xpYBVuVdNbVW2RAH67fXbO3kXLW0s45C5Mgg';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. App will run in Mock Mode.');
}

// Create single instance
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
});
