import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function main() {
    const { data: c, error: cErr } = await supabase.from('partners').select('*').limit(1);
    console.log("Check auth:", cErr ? cErr.message : "Success reading partners");

    // Attempt an RPC to bypass RLS or simply use a predefined user? No, we don't know the password...
    // Let's rely on the browser's context!
}

main();
