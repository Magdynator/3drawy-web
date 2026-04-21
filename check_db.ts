import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCol() {
    // Intentionally cause an error to see the column type, or just select it
    const { data, error } = await supabase.from('quiz_questions').select('image_url').limit(1);
    console.log("Data:", data);
    console.log("Error:", error);
}

checkCol();
