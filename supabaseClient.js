import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌ ERROR: Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_KEY');
  process.exit(1);
}

// Create Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    auth: {
      persistSession: false // Bot doesn't need auth session
    }
  }
);

// Test connection
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('landlords')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
}
