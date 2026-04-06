const { createClient } = require('@supabase/supabase-js');
const env = require('dotenv').config().parsed;
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
(async () => {
    const { data, error } = await supabase.rpc('execute_sql', { sql: 'NOTIFY pgrst, "reload schema";' });
    console.log('Reloaded schema', error);
})();
