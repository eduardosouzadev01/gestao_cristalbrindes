import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importClients() {
    console.log('📂 Reading cadastrocliente.csv...');

    const csvPath = path.join(__dirname, '../cadastrocliente.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    console.log('📊 Parsing CSV...');

    const { data, errors } = Papa.parse(csvContent, {
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
    });

    if (errors.length > 0) {
        console.warn('⚠️ Some rows had parsing errors and will be skipped:', errors.length);
        // Log first few errors for debugging
        errors.slice(0, 5).forEach(err => console.warn(`  - Row ${err.row}: ${err.message}`));
    }

    console.log(`✅ Parsed ${data.length} rows.`);

    const clientsToInsert: any[] = [];

    data.forEach((row: any) => {
        // Mapping logic
        const company = row['Empresa']?.trim();
        const buyer = row['Nome']?.trim();

        let name = company || buyer || 'Sem Nome';

        // If both exist and are different, combine them for better visibility
        if (company && buyer && company.toLowerCase() !== buyer.toLowerCase()) {
            name = `${company} (${buyer})`;
        } else if (buyer && !company) {
            name = buyer;
        }

        name = name.substring(0, 255);

        const email = row['Email']?.trim() || null;
        let doc = row['CNPJ']?.trim() || null;
        if (doc === '') doc = null;

        const phone = row['Fone comercial']?.trim() || null;
        const salesperson = row['Vendedor']?.trim() || null;

        // Skip if everything is empty
        if (name === 'Sem Nome' && !email && !doc) return;

        clientsToInsert.push({
            name,
            email,
            doc,
            phone,
            salesperson,
            type: 'CLIENTE'
        });
    });

    console.log(`🚀 Inserting ${clientsToInsert.length} clients into Supabase (allowing multiple buyers per CNPJ)...`);

    // Chunk size for bulk insert to avoid timeout/size limits
    const CHUNK_SIZE = 500;
    for (let i = 0; i < clientsToInsert.length; i += CHUNK_SIZE) {
        const chunk = clientsToInsert.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from('partners').insert(chunk);

        if (error) {
            console.error(`❌ Error inserting chunk ${i / CHUNK_SIZE + 1}:`, error.message);
        } else {
            console.log(`✅ Inserted chunk ${i / CHUNK_SIZE + 1} (${chunk.length} clients)`);
        }
    }

    console.log('\n✨ Import completed!');
}

importClients().catch(err => {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
});
