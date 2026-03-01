import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
(async () => {
    const { data, error } = await supabase.rpc('execute_sql', { sql: 'NOTIFY pgrst, "reload schema";' });
    console.log('Reload schema result:', data, error);
})();
