import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing URL or KEY");
    process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
    const suppliers = [
        { type: 'FORNECEDOR', name: 'XBZ', supplier_category: 'PRODUTOS' },
        { type: 'FORNECEDOR', name: 'ASIA', supplier_category: 'PRODUTOS' },
        { type: 'FORNECEDOR', name: 'SPOT', supplier_category: 'PRODUTOS' }
    ];

    for (const sup of suppliers) {
        const { data, error } = await supabase
            .from('partners')
            .upsert(sup, { onConflict: 'name', ignoreDuplicates: true })
            .select();

        if (error) { // Try insert if upsert not supported properly
            const { error: err2 } = await supabase.from('partners').insert([sup]);
            console.log("Insert result for", sup.name, err2 ? err2.message : 'OK');
        } else {
            console.log("Upsert result for", sup.name, "OK", data);
        }
    }
}
main();
