import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// O Node v22 carregará as variáveis via --env-file .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Prefer the service role key to bypass RLS during backup. Fallback to anon key.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados.');
  console.log('Execute com: node --env-file=.env.local scripts/backup.mjs');
  process.exit(1);
}


const supabase = createClient(supabaseUrl, supabaseKey);

const TABLES_TO_BACKUP = [
  'partners',
  'budgets',
  'budget_items',
  'crm_leads',
  'orders',
  'order_items',
  'proposals',
  'user_profiles'
];

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups', timestamp);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`🚀 Iniciando backup em: ${backupDir}`);

  for (const table of TABLES_TO_BACKUP) {
    console.log(`📦 Baixando tabela: ${table}...`);
    
    const { data, error } = await supabase
      .from(table)
      .select('*');

    if (error) {
      console.error(`❌ Erro ao baixar ${table}:`, error.message);
      continue;
    }

    const filePath = path.join(backupDir, `${table}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ ${table} salva com sucesso (${data?.length || 0} registros).`);
  }

  console.log('\n✨ Backup concluído com sucesso!');
  console.log(`📍 Localização: ${backupDir}`);
}

runBackup().catch(err => {
  console.error('💥 Erro fatal no backup:', err);
  process.exit(1);
});
