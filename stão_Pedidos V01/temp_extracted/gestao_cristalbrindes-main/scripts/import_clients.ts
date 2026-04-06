import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import pkg from 'papaparse';
const { parse } = pkg;

// Initialize Supabase
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const formatDoc = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
        return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4").substring(0, 14);
    }
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5").substring(0, 18);
};

const parseCSV = () => {
    // Attempt Latin-1 / Windows-1252 reading
    const csvData = fs.readFileSync('c:/Users/eduardosouza/Desktop/Gestão de Pedidos/Gestão_Pedidos V01/cadastrocliente_atualizado.csv', 'latin1');

    parse(csvData, {
        header: true,
        delimiter: ';',
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: async (results) => {
            const records = results.data;
            let successCount = 0;
            let skipCount = 0;
            let errorCount = 0;

            console.log(`Found ${records.length} records in CSV. Starting import...`);

            for (const row of records) {
                let docRaw = row['CNPJ'] || row['CPF'] || '';
                docRaw = formatDoc(docRaw);
                const emailRaw = row['Email'] ? row['Email'].toLowerCase().trim() : '';
                const nameRaw = (row['Nome'] || row['Empresa'] || 'Sem Nome').trim();
                const phoneRaw = row['Telefone'] || '';
                const salespersonRaw = row['vendedor'] || row['Vendedor'] || '';

                if (!emailRaw && !docRaw) {
                    skipCount++;
                    continue;
                }

                // Check by doc or email
                let query = supabase.from('partners').select('id, name').eq('type', 'CLIENTE');
                const orConditions: string[] = [];
                if (emailRaw) orConditions.push(`email.eq.${emailRaw}`);
                if (docRaw) orConditions.push(`doc.eq.${docRaw}`);

                if (orConditions.length > 0) {
                    query = query.or(orConditions.join(','));
                } else {
                    query = query.eq('name', nameRaw);
                }

                const { data: existing } = await query;

                if (existing && existing.length > 0) {
                    // Update
                    const partnerId = existing[0].id;
                    const { error } = await supabase.from('partners').update({
                        salesperson: salespersonRaw,
                        name: nameRaw,
                        doc: docRaw || null,
                        phone: phoneRaw || null
                    }).eq('id', partnerId);
                    if (error) {
                        errorCount++;
                        console.log(`Error updating ${nameRaw}:`, error.message);
                    } else {
                        successCount++;
                    }
                } else {
                    // Insert
                    const { error } = await supabase.from('partners').insert([{
                        type: 'CLIENTE',
                        name: nameRaw,
                        email: emailRaw,
                        doc: docRaw || null,
                        phone: phoneRaw || null,
                        salesperson: salespersonRaw
                    }]);
                    if (error) {
                        // Unique violation fallback to update by doc
                        if (error.code === '23505' && docRaw) {
                            const { error: updErr } = await supabase.from('partners').update({ salesperson: salespersonRaw }).eq('doc', docRaw);
                            if (updErr) {
                                errorCount++;
                                console.log(`Error fallback updating ${nameRaw}:`, updErr.message);
                            } else {
                                successCount++;
                            }
                        } else {
                            errorCount++;
                            console.log(`Error inserting ${nameRaw}:`, error.message);
                        }
                    } else {
                        successCount++;
                    }
                }
            }

            console.log(`Import finished!`);
            console.log(`Updated/Inserted/Processed successfully: ${successCount}`);
            console.log(`Skipped (No Email/CNPJ): ${skipCount}`);
            console.log(`Errors: ${errorCount}`);
        }
    });
};

parseCSV();
