import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeedScript() {
    console.log('🌱 Starting database seeding...\n');

    try {
        // Read the seed SQL file
        const seedFilePath = path.join(__dirname, '../supabase/migrations/999_cleanup_and_seed.sql');
        const seedSQL = fs.readFileSync(seedFilePath, 'utf-8');

        console.log('📄 Loaded seed script from:', seedFilePath);
        console.log('📊 Executing SQL...\n');

        // Execute the SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql: seedSQL });

        if (error) {
            // If exec_sql RPC doesn't exist, try direct execution (requires service role key)
            console.log('⚠️  exec_sql RPC not found. Trying alternative method...\n');

            // Split the SQL into individual statements
            const statements = seedSQL
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));

            for (const statement of statements) {
                if (statement.includes('DO $$')) {
                    // Handle DO blocks specially
                    const fullBlock = seedSQL.substring(
                        seedSQL.indexOf('DO $$'),
                        seedSQL.indexOf('END $$;') + 7
                    );
                    console.log('⚠️  Cannot execute DO blocks via client. Please run this manually in Supabase SQL Editor:');
                    console.log('\n' + fullBlock + '\n');
                    break;
                }
            }

            console.log('\n⚠️  MANUAL EXECUTION REQUIRED');
            console.log('Please execute the seed script manually in Supabase SQL Editor:');
            console.log('1. Go to Supabase Dashboard > SQL Editor');
            console.log('2. Copy the contents of: supabase/migrations/999_cleanup_and_seed.sql');
            console.log('3. Paste and run the script');
            return;
        }

        console.log('✅ Database seeded successfully!');
        console.log('\n📈 Created:');
        console.log('  - 7 Partners (4 Clients + 3 Suppliers)');
        console.log('  - 6 Calculation Factors');
        console.log('  - 5 CRM Leads (various statuses)');
        console.log('  - 5 Company Expenses');
        console.log('  - 3 Budgets');
        console.log('  - 3 Orders with complete financial data');
        console.log('  - Multiple order items with real costs');
        console.log('  - Commissions for paid orders');
        console.log('\n🎯 Next Steps:');
        console.log('  1. Refresh your application');
        console.log('  2. Check Receivables page (should show 6 items)');
        console.log('  3. Check Payables page (should show multiple cost items)');
        console.log('  4. Re-run TestSprite tests');

    } catch (err: any) {
        console.error('❌ Error during seeding:', err.message);
        process.exit(1);
    }
}

runSeedScript();
