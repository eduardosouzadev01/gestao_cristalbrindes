import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://agjrnmpgudrciorchpog.supabase.co';
const supabaseKey = 'sb_publishable_XtMU32fyhwIHHt_cSKWwQg_AgOuD8SM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearNotifications() {
  console.log('Iniciando limpeza da tabela notifications...');
  const { error } = await supabase.from('notifications').delete().not('created_at', 'is', null);
  if (error) {
     console.error('Erro ao deletar notificações:', error);
  } else {
     console.log('✅ Todas as notificações persistentes foram apagadas com sucesso.');
  }
}

clearNotifications();
