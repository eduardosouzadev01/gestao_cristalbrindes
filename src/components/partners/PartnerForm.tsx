'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Partner } from '@/types/partner';

const partnerSchema = z.object({
    name: z.string().min(3, 'Nome é obrigatório'),
    company_name: z.string().optional(),
    type: z.enum(['CLIENTE', 'FORNECEDOR']),
    doc: z.string().optional(),
    ie: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().optional(),
    zip_code: z.string().optional(),
    address: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    contact_name: z.string().optional(),
    salesperson: z.string().optional(),
    notes: z.string().optional(),
    email_fin: z.string().email('Email inválido').optional().or(z.literal('')),
    segment: z.string().optional(),
    origin: z.string().optional(),
    website: z.string().optional(),
    social_media: z.string().optional(),
});

type PartnerFormData = z.infer<typeof partnerSchema>;

interface PartnerFormProps {
    initialData?: Partner;
    defaultType?: 'CLIENTE' | 'FORNECEDOR';
}

export default function PartnerForm({ initialData, defaultType = 'CLIENTE' }: PartnerFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<PartnerFormData>({
        resolver: zodResolver(partnerSchema),
        defaultValues: {
            type: defaultType,
            ...initialData
        }
    });

    useEffect(() => {
        if (initialData) {
            reset({
                ...initialData,
                type: initialData.type
            });
        }
    }, [initialData, reset]);

    const onSubmit = async (data: PartnerFormData) => {
        try {
            setLoading(true);
            if (initialData) {
                const { error } = await supabase
                    .from('partners')
                    .update(data)
                    .eq('id', initialData.id);
                
                if (error) throw error;

                // Bulk transfer if salesperson changed
                if (data.salesperson && data.salesperson !== initialData.salesperson) {
                    console.log(`Propagating salesperson change (${initialData.salesperson} -> ${data.salesperson}) to related records`);
                    
                    const salespersonCode = data.salesperson;
                    const partnerId = initialData.id;

                    // Update Leads
                    await supabase.from('crm_leads').update({ salesperson: salespersonCode }).eq('client_id', partnerId);
                    
                    // Update Budgets
                    await supabase.from('budgets').update({ salesperson: salespersonCode }).eq('client_id', partnerId);
                    
                    // Update Proposals
                    await supabase.from('proposals').update({ salesperson: salespersonCode }).eq('client_id', partnerId);
                    
                    // Update Orders
                    await supabase.from('orders').update({ salesperson: salespersonCode }).eq('client_id', partnerId);
                }

                toast.success('Cadastro atualizado com sucesso!');
            } else {
                const { error } = await supabase
                    .from('partners')
                    .insert([data]);
                if (error) throw error;
                toast.success('Cadastro realizado com sucesso!');
            }
            router.back();
        } catch (error: any) {
            toast.error('Erro ao salvar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-[1000px] mx-auto px-8 py-8 animate-in fade-in duration-500">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Header Section */}
                <div className="flex items-center justify-between border-b border-[#E3E3E4] pb-8">
                    <div>
                        <h1 className="text-2xl font-medium text-[#111827] uppercase tracking-tighter flex items-center gap-3">
                            <span className="material-icons-outlined text-[#0F6CBD] text-3xl">
                                {initialData ? 'edit_note' : 'person_add'}
                            </span>
                            {initialData ? 'Editar Cadastro' : `Novo ${defaultType === 'CLIENTE' ? 'Cliente' : 'Fornecedor'}`}
                        </h1>
                        <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mt-1">Preencha as informações detalhadas abaixo</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="h-11 px-6 bg-white border border-[#E3E3E4] text-[#6B7280] rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-[#F5F5F8] transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="h-11 px-8 bg-[#0F6CBD] text-white rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-[#115EA3] transition-all shadow-none shadow-none-[#0F6CBD]/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Salvando...' : 'Salvar Cadastro'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Basic Info */}
                    <div className="space-y-6 bg-white p-8 rounded-md border border-[#E3E3E4] shadow-none">
                        <h3 className="text-[11px] font-medium text-[#6B7280] uppercase tracking-widest flex items-center gap-2 mb-2">
                             <span className="w-1.5 h-1.5 rounded-full bg-[#0F6CBD]"></span>
                             Informações Básicas
                        </h3>
                        
                        <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">
                                        Tipo de Cadastro {initialData && <span className="text-[#0F6CBD] ml-1">(Bloqueado para Edição)</span>}
                                    </label>
                                    <div className={`w-full h-11 px-4 ${initialData ? 'bg-gray-100/50 grayscale' : 'bg-gray-100'} border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] flex items-center uppercase tracking-tight`}>
                                        {defaultType}
                                    </div>
                                    <input type="hidden" {...register('type')} />
                                </div>

                            <div>
                                <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Nome / Razão Social *</label>
                                <input 
                                    {...register('name')}
                                    className={`w-full h-11 px-4 bg-[#F9FAFB] border ${errors.name ? 'border-red-500' : 'border-[#E3E3E4]'} rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all uppercase`}
                                    placeholder="Ex: EMPRESA LTDA"
                                />
                                {errors.name && <p className="text-[9px] text-red-500 font-medium mt-1 ml-1">{errors.name.message}</p>}
                            </div>

                            <div>
                                <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Nome Fantasia (Opcional)</label>
                                <input 
                                    {...register('company_name')}
                                    className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all uppercase"
                                />
                            </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">CPF / CNPJ</label>
                                        <input 
                                            {...register('doc')}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '');
                                                let masked = '';
                                                if (value.length <= 11) {
                                                    masked = value
                                                        .replace(/(\d{3})(\d)/, '$1.$2')
                                                        .replace(/(\d{3})(\d)/, '$1.$2')
                                                        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                                                } else {
                                                    masked = value
                                                        .replace(/(\d{2})(\d)/, '$1.$2')
                                                        .replace(/(\d{3})(\d)/, '$1.$2')
                                                        .replace(/(\d{3})(\d{4})/, '$1/$2')
                                                        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
                                                }
                                                setValue('doc', masked.substring(0, 18));
                                            }}
                                            maxLength={18}
                                            className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all tabular-nums"
                                            placeholder="00.000.000/0001-00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Insc. Estadual</label>
                                        <input 
                                            {...register('ie')}
                                            className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all uppercase"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Nome do Contato</label>
                                        <input 
                                            {...register('contact_name')}
                                            className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all uppercase"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Vendedor Responsável</label>
                                        <input 
                                            {...register('salesperson')}
                                            className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all uppercase"
                                            placeholder="Ex: VENDAS 01"
                                        />
                                    </div>
                                </div>
                        </div>
                    </div>

                    {/* Contact & Address */}
                    <div className="space-y-6 bg-white p-8 rounded-md border border-[#E3E3E4] shadow-none">
                        <h3 className="text-[11px] font-medium text-[#6B7280] uppercase tracking-widest flex items-center gap-2 mb-2">
                             <span className="w-1.5 h-1.5 rounded-full bg-[#0F6CBD]"></span>
                             Contato e Localização
                        </h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">CEP</label>
                                    <input 
                                        {...register('zip_code')}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length <= 8) {
                                                setValue('zip_code', val.replace(/(\d{5})(\d{3})/, '$1-$2'));
                                            }
                                        }}
                                        className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all tabular-nums"
                                        placeholder="00000-000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Telefone / WhatsApp</label>
                                    <input 
                                        {...register('phone')}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            if (val.length <= 10) {
                                                setValue('phone', val.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3'));
                                            } else {
                                                setValue('phone', val.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'));
                                            }
                                        }}
                                        className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all tabular-nums"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Segmento / Ramo</label>
                                <input 
                                    {...register('segment')}
                                    className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all uppercase"
                                    placeholder="Ex: TECNOLOGIA, EDUCAÇÃO"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Email Principal</label>
                                    <input 
                                        {...register('email')}
                                        className={`w-full h-11 px-4 bg-[#F9FAFB] border ${errors.email ? 'border-red-500' : 'border-[#E3E3E4]'} rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all`}
                                        placeholder="exemplo@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Email Financeiro (Opcional)</label>
                                    <input 
                                        {...register('email_fin')}
                                        className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all"
                                        placeholder="financeiro@email.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                     <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Origem / Como conheceu</label>
                                     <select 
                                         {...register('origin')}
                                         className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all uppercase font-jakarta"
                                     >
                                         <option value="">Selecione uma opção</option>
                                         <option value="GOOGLE">Google / Pesquisa</option>
                                         <option value="INSTAGRAM">Instagram</option>
                                         <option value="INDICACAO">Indicação</option>
                                         <option value="CLIENTE_ANTIGO">Cliente Antigo</option>
                                         <option value="OUTROS">Outros</option>
                                     </select>
                                 </div>
                                 <div className="flex flex-col justify-center">
                                     <p className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter leading-tight px-1">Selecione como o cliente chegou até nós para controle de marketing.</p>
                                 </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Website</label>
                                    <input 
                                        {...register('website')}
                                        className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all"
                                        placeholder="www.empresa.com.br"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Redes Sociais (Instagram/LinkedIn)</label>
                                    <input 
                                        {...register('social_media')}
                                        className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all"
                                        placeholder="@empresa ou linkedin.com/in/..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-8">
                                    <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Logradouro (Rua/Av)</label>
                                    <input 
                                        {...register('address')}
                                        className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all uppercase"
                                    />
                                </div>
                                <div className="col-span-4">
                                    <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Número</label>
                                    <input 
                                        {...register('number')}
                                        className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all uppercase"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Complemento</label>
                                    <input 
                                        {...register('complement')}
                                        className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Bairro</label>
                                    <input 
                                        {...register('neighborhood')}
                                        className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all uppercase"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Cidade</label>
                                    <input 
                                        {...register('city')}
                                        className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Estado (UF)</label>
                                    <input 
                                        {...register('state')}
                                        className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all uppercase"
                                        maxLength={2}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="bg-white p-8 rounded-md border border-[#E3E3E4] shadow-none">
                    <h3 className="text-[11px] font-medium text-[#6B7280] uppercase tracking-widest flex items-center gap-2 mb-4">
                         <span className="w-1.5 h-1.5 rounded-full bg-[#0F6CBD]"></span>
                         Observações Internas
                    </h3>
                    <textarea 
                        {...register('notes')}
                        rows={4}
                        className="w-full p-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all uppercase resize-none"
                    ></textarea>
                </div>
            </form>
        </div>
    );
}
