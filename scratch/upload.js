import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://agjrnmpgudrciorchpog.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_XtMU32fyhwIHHt_cSKWwQg_AgOuD8SM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadLogo() {
    const imgPath = path.join(process.cwd(), 'public', 'img', 'logo_proposta.png');
    const fileContent = fs.readFileSync(imgPath);
    
    const fileName = `logo_proposta_${Date.now()}.png`;
    
    console.log('Uploading...', fileName);
    
    // Using catalog-assets bucket which we know exists
    const { data, error } = await supabase.storage
        .from('catalog-assets')
        .upload(`logo-images/${fileName}`, fileContent, {
            contentType: 'image/png',
            upsert: true
        });
        
    if (error) {
        console.error('Upload Error:', error.message);
        return;
    }
    
    console.log('Upload Success:', data);
    
    const { data: publicUrlData } = supabase.storage
        .from('catalog-assets')
        .getPublicUrl(`logo-images/${fileName}`);
        
    console.log('Public URL:', publicUrlData.publicUrl);
}

uploadLogo();
