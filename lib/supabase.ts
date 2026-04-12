import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vzzzqsmqqaoilkmskadl.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'build-time-placeholder';

// Only create client if we have valid keys (for runtime, not build)
export const supabase = typeof window !== 'undefined' || process.env.NODE_ENV === 'production' 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export type Database = {
  public: {
    Tables: {
      division_budgets: {
        Row: {
          id: string;
          division: string;
          monthly_budget: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          division: string;
          monthly_budget: number;
        };
        Update: {
          monthly_budget?: number;
        };
      };
      expenses: {
        Row: {
          id: string;
          division: string;
          category: string;
          amount: number;
          description: string;
          date: string;
          created_at: string;
        };
        Insert: {
          division: string;
          category: string;
          amount: number;
          description: string;
          date: string;
        };
      };
      revenue: {
        Row: {
          id: string;
          product_name: string;
          amount: number;
          source: string;
          date: string;
          created_at: string;
        };
        Insert: {
          product_name: string;
          amount: number;
          source: string;
          date: string;
        };
      };
    };
  };
};
