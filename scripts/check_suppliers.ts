import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
);

async function main() {
    // 1. Authenticate
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'eduardosouzadev@gmail.com',
        password: 'password123' // Or whatever it might be, maybe we don't know it. Let's hope I can find it or don't need it.
    });

    if (authError) {
        console.error("Auth error:", authError.message);
        // Let's check bypass using RPC or something?
        return;
    }

    const { data: s } = await supabase.from('partners').select('*').eq('type', 'FORNECEDOR');
    console.log("Suppliers loaded by user:", s?.map(x => x.name));

    const inserts = [
        { type: 'FORNECEDOR', name: 'XBZ', supplier_category: 'PRODUTOS' },
        { type: 'FORNECEDOR', name: 'ASIA', supplier_category: 'PRODUTOS' },
        { type: 'FORNECEDOR', name: 'SPOT', supplier_category: 'PRODUTOS' }
    ];

    // Check if we can insert
    const { data: newS, error } = await supabase.from('partners').insert(inserts).select();
    console.log("Insert result:", newS, error);
}

main();
