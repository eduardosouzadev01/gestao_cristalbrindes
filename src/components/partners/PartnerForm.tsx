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
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().optional(),
    zip_code: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    contact_name: z.string().optional(),
    salesperson: z.string().optional(),
    notes: z.string().optional(),
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
                                            className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Nome do Contato</label>
                                        <input 
                                            {...register('contact_name')}
                                            className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all uppercase"
                                        />
                                    </div>
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

                    {/* Contact & Address */}
                    <div className="space-y-6 bg-white p-8 rounded-md border border-[#E3E3E4] shadow-none">
                        <h3 className="text-[11px] font-medium text-[#6B7280] uppercase tracking-widest flex items-center gap-2 mb-2">
                             <span className="w-1.5 h-1.5 rounded-full bg-[#0F6CBD]"></span>
                             Contato e Localização
                        </h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Telefone</label>
                                    <input 
                                        {...register('phone')}
                                        className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">CEP</label>
                                    <input 
                                        {...register('zip_code')}
                                        className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Email</label>
                                <input 
                                    {...register('email')}
                                    className={`w-full h-11 px-4 bg-[#F9FAFB] border ${errors.email ? 'border-red-500' : 'border-[#E3E3E4]'} rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all`}
                                    placeholder="exemplo@email.com"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Endereço Completo</label>
                                <input 
                                    {...register('address')}
                                    className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] focus:ring-2 focus:ring-[#0F6CBD]/20 outline-none transition-all uppercase"
                                />
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
