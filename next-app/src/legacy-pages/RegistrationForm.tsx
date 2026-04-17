import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// --- Útils de Formatação ---
const formatDoc = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4").substring(0, 14);
  }
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5").substring(0, 18);
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3").substring(0, 14);
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3").substring(0, 15);
};

// --- Schema de Validação (O "banco de dados" não aceita falhas) ---
const registrationSchema = z.object({
  name: z.string().min(3, 'O nome deve ter no mínimo 3 caracteres'),
  contact_name: z.string().optional().or(z.literal('')),
  doc: z.string().min(14, 'Documento inválido'),
  phone: z.string().min(14, 'Telefone incompleto'),
  email: z.string().email('E-mail inválido'),
  financial_email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  supplier_category: z.string().min(1, 'Selecione uma categoria'),
  salesperson: z.string().optional()
});

type RegistrationData = z.infer<typeof registrationSchema>;

// --- Componente da Nova Arquitetura ---
const RegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [activeStep, setActiveStep] = useState<'TYPE' | 'FORM'>('TYPE');
  const [partnerType, setPartnerType] = useState<'CLIENTE' | 'FORNECEDOR'>('CLIENTE');

  // React Hook Form integrado com Zod
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      supplier_category: 'PRODUTOS',
      salesperson: ''
    }
  });

  // Mutação com React Query para o Salvar (Substitui os isLoading espalhados)
  const savePartnerMutation = useMutation({
    mutationFn: async (data: RegistrationData) => {
      const payload: any = { ...data };

      if (partnerType === 'CLIENTE') {
        payload.supplier_category = null;
        payload.salesperson = data.salesperson || null;
      } else {
        payload.salesperson = null;
      }

      if (id) {
        const { error } = await supabase.from('partners').update(payload).eq('id', id);
        if (error) throw error;
        
        // --- Atualiza Orçamentos e Propostas Vinculados ---
        // Se for edição de um cliente, repassa a visibilidade (salesperson)
        // para todos os orçamentos e propostas desse cliente.
        if (partnerType === 'CLIENTE') {
          // Atualiza orçamentos (budgets)
          await supabase.from('budgets')
            .update({ salesperson: payload.salesperson })
            .eq('client_id', id);
            
          // Atualiza propostas (proposals)
          await supabase.from('proposals')
            .update({ salesperson: payload.salesperson })
            .eq('client_id', id);
        }
        
        return 'Cadastro atualizado com sucesso!';
      } else {
        payload.type = partnerType;
        const { error, data } = await supabase.from('partners').insert([payload]).select().single();
        if (error) throw error;
        return `Cadastro de ${partnerType} salvo com sucesso!`;
      }
    },
    onSuccess: (message) => {
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['partners'] }); // Limpa o cache das tabelas
      if (partnerType === 'FORNECEDOR') {
        navigate('/fornecedores');
      } else {
        navigate('/clientes');
      }
    },
    onError: (error: any) => {
      console.error('Erro ao salvar:', error);
      if (error.code === '23505') {
        toast.error('Erro: Já existe um cadastro com este CNPJ/CPF ou Nome.');
      } else {
        toast.error(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
      }
    }
  });

  // Carregar dados existentes
  useEffect(() => {
    const tipo = searchParams.get('tipo');
    if (tipo === 'CLIENTE' || tipo === 'FORNECEDOR') {
      setPartnerType(tipo);
    }

    if (id) {
      loadPartner(id);
    }
  }, [id, searchParams]);

  const loadPartner = async (partnerId: string) => {
    try {
      const { data, error } = await supabase.from('partners').select('*').eq('id', partnerId).single();
      if (data) {
        setPartnerType(data.type);
        reset({
          name: data.name || '',
          contact_name: data.contact_name || '',
          doc: data.doc || '',
          phone: data.phone || '',
          email: data.email || '',
          financial_email: data.financial_email || '',
          supplier_category: data.supplier_category || 'PRODUTOS',
          salesperson: data.salesperson || ''
        });
        setActiveStep('FORM');
      }
    } catch (err) {
      toast.error('Erro ao carregar cadastro associado.');
    }
  };

  const handleSelectType = (type: 'CLIENTE' | 'FORNECEDOR') => {
    setPartnerType(type);
    setActiveStep('FORM');
    reset(); // Limpa form
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10 flex items-center">
        <button
          onClick={() => activeStep === 'FORM' ? setActiveStep('TYPE') : navigate(partnerType === 'FORNECEDOR' ? '/fornecedores' : '/clientes')}
          className="mr-4 p-2 rounded-full bg-white shadow-sm hover:bg-gray-50 border border-gray-200 text-gray-500 transition-colors"
        >
          <span className="material-icons-outlined text-xl">arrow_back</span>
        </button>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate flex items-center gap-3">
          <span className="material-icons-outlined text-blue-500 text-3xl">{id ? 'edit' : 'person_add'}</span>
          {id ? 'EDITAR CADASTRO' : 'NOVO CADASTRO'}
        </h2>
      </div>

      {activeStep === 'TYPE' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button
            onClick={() => handleSelectType('CLIENTE')}
            className="group flex flex-col items-center justify-center p-12 bg-white border-2 border-transparent hover:border-blue-500 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300"
          >
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="material-icons-outlined text-4xl">person</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">CLIENTE</h3>
            <p className="text-sm text-gray-500 text-center">Cadastrar pessoa física ou jurídica para faturamento de pedidos.</p>
          </button>

          <button
            onClick={() => handleSelectType('FORNECEDOR')}
            className="group flex flex-col items-center justify-center p-12 bg-white border-2 border-transparent hover:border-emerald-500 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300"
          >
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="material-icons-outlined text-4xl">local_shipping</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">FORNECEDOR</h3>
            <p className="text-sm text-gray-500 text-center">Cadastrar parceiro para fornecimento de produtos ou personalização.</p>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit((data) => savePartnerMutation.mutate(data))} className="bg-white shadow-2xl rounded-3xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-white px-8 py-6 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-900 uppercase">Preencha os Dados: {partnerType}</h3>
              <p className="text-xs text-gray-400 font-medium">Todos os campos marcados com * são obrigatórios</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${partnerType === 'CLIENTE' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {partnerType}
            </span>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nome / Razão Social *</label>
                <input
                  {...register('name')}
                  className={`form-input w-full rounded-xl py-3 ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                  placeholder="Nome completo ou Razão Social"
                />
                {errors.name && <span className="text-red-500 text-xs mt-1 block">{errors.name.message}</span>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nome do Contato</label>
                <input
                  {...register('contact_name')}
                  className={`form-input w-full rounded-xl py-3 ${errors.contact_name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                  placeholder="Nome da pessoa responsável pela conta"
                />
                {errors.contact_name && <span className="text-red-500 text-xs mt-1 block">{errors.contact_name.message}</span>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">CNPJ / CPF *</label>
                <input
                  {...register('doc')}
                  onChange={(e) => {
                    setValue('doc', formatDoc(e.target.value), { shouldValidate: true });
                  }}
                  className={`form-input w-full rounded-xl py-3 ${errors.doc ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                  placeholder="00.000.000/0000-00"
                />
                {errors.doc && <span className="text-red-500 text-xs mt-1 block">{errors.doc.message}</span>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Telefone *</label>
                <input
                  {...register('phone')}
                  onChange={(e) => {
                    setValue('phone', formatPhone(e.target.value), { shouldValidate: true });
                  }}
                  className={`form-input w-full rounded-xl py-3 ${errors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                  placeholder="(00) 00000-0000"
                />
                {errors.phone && <span className="text-red-500 text-xs mt-1 block">{errors.phone.message}</span>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">E-mail *</label>
                <input
                  {...register('email')}
                  className={`form-input w-full rounded-xl py-3 ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                  placeholder="contato@empresa.com"
                />
                {errors.email && <span className="text-red-500 text-xs mt-1 block">{errors.email.message}</span>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">E-mail Financeiro</label>
                <input
                  {...register('financial_email')}
                  className={`form-input w-full rounded-xl py-3 ${errors.financial_email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                  placeholder="financeiro@empresa.com"
                />
                {errors.financial_email && <span className="text-red-500 text-xs mt-1 block">{errors.financial_email.message}</span>}
              </div>

              {partnerType === 'FORNECEDOR' && (
                <div>
                  <label className="block text-xs font-bold text-blue-500 uppercase mb-2">Categoria Fornecedor *</label>
                  <select
                    {...register('supplier_category')}
                    className="form-select w-full rounded-xl border-blue-200 py-3 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="PRODUTOS">Fornecedor de Produtos</option>
                    <option value="PERSONALIZACAO">Fornecedor de Personalização</option>
                    <option value="TRANSPORTADORA">Transportadora</option>
                  </select>
                </div>
              )}

              {partnerType === 'CLIENTE' && (
                <div>
                  <label className="block text-xs font-bold text-purple-500 uppercase mb-2">Vendedor Responsável</label>
                  <select
                    {...register('salesperson')}
                    className="form-select w-full rounded-xl border-purple-200 py-3 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Nenhum</option>
                    <option value="VENDAS 01">VENDAS 01</option>
                    <option value="VENDAS 02">VENDAS 02</option>
                    <option value="VENDAS 03">VENDAS 03</option>
                    <option value="VENDAS 04">VENDAS 04</option>
                  </select>
                </div>
              )}
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={savePartnerMutation.isPending}
                className="flex-1 py-4 bg-blue-500 text-white font-black rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-600 active:scale-[0.98] transition-all uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savePartnerMutation.isPending ? 'SALVANDO...' : 'SALVAR CADASTRO'}
              </button>
              <button
                type="button"
                onClick={() => setActiveStep('TYPE')}
                className="px-8 py-4 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-200 transition-colors uppercase text-sm"
              >
                VOLTAR
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default RegistrationForm;
