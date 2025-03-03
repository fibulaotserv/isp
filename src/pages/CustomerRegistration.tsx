import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  UserPlus, Building2, User, Loader2, Save, Edit, ArrowLeft, 
  FileText, Ban, Clock, Receipt, CreditCard, CheckCircle, AlertCircle,
  MapPin, Network, X, Search
} from 'lucide-react';

import type { Customer } from '../types/customer';
import type { Plan } from '../types/plan';
import type { Invoice } from '../types/billing';
import type { CTO } from '../types/network';
import { getCustomer, updateCustomer, createCustomer } from '../services/customerService';
import { getPlans } from '../services/planService';
import { getCustomerInvoices, generateInvoice, registerManualPayment, updateCustomerStatus } from '../services/billingService';
import { findNearestCTO, associateCustomerWithCTO } from '../services/networkService';
import { searchCep } from '../services/viaCep';
import FormattedInput from '../components/FormattedInput';
import { formatDocument, formatPhone, formatZipCode } from '../utils/formatters';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

type Tab = 'info' | 'billing' | 'network';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

interface CustomerRegistrationProps {
  onClose: () => void;
}

export default function CustomerRegistration({ onClose }: CustomerRegistrationProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [customerType, setCustomerType] = useState<'individual' | 'business'>('individual');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isSearchingCTO, setIsSearchingCTO] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nearestCTO, setNearestCTO] = useState<CTO | null>(null);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: customerType,
    name: '',
    trade_name: '',
    state_registration: '',
    birth_date: '',
    responsible_name: '',
    responsible_document: '',
    document: '',
    email: '',
    phone: '',
    plan_id: '',
    status: 'active' as const,
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
      latitude: undefined as number | undefined,
      longitude: undefined as number | undefined
    }
  });

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    // Atualizar o tipo de cliente no formData quando o customerType mudar
    setFormData(prev => ({
      ...prev,
      type: customerType
    }));
  }, [customerType]);

  const loadPlans = async () => {
    try {
      const data = await getPlans();
      setPlans(data);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    // Validar campos obrigatórios
    if (!formData.name) {
      errors['name'] = 'Nome é obrigatório';
    }
    
    if (customerType === 'business' && !formData.trade_name) {
      errors['trade_name'] = 'Razão Social é obrigatória';
    }
    
    if (customerType === 'business' && !formData.responsible_name) {
      errors['responsible_name'] = 'Nome do Responsável é obrigatório';
    }
    
    if (customerType === 'business' && (!formData.responsible_document || formData.responsible_document.replace(/\D/g, '').length !== 11)) {
      errors['responsible_document'] = 'CPF do Responsável é obrigatório e deve ter 11 dígitos';
    }
    
    if (!formData.document) {
      errors['document'] = `${customerType === 'individual' ? 'CPF' : 'CNPJ'} é obrigatório`;
    } else {
      const cleanDocument = formData.document.replace(/\D/g, '');
      if ((customerType === 'individual' && cleanDocument.length !== 11) || 
          (customerType === 'business' && cleanDocument.length !== 14)) {
        errors['document'] = `${customerType === 'individual' ? 'CPF deve ter 11 dígitos' : 'CNPJ deve ter 14 dígitos'}`;
      }
    }
    
    if (!formData.phone) {
      errors['phone'] = 'Telefone é obrigatório';
    } else {
      const cleanPhone = formData.phone.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        errors['phone'] = 'Telefone deve ter entre 10 e 11 dígitos';
      }
    }
    
    if (!formData.email) {
      errors['email'] = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors['email'] = 'Email inválido';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Limpar mensagem de sucesso
    setSuccessMessage(null);
    
    // Validar formulário
    if (!validateForm()) {
      alert('Por favor, corrija os erros no formulário antes de continuar.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Verificar se o usuário está autenticado
      console.log('Estado do usuário:', user);
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      console.log('Usuário do Supabase:', supabaseUser);
      
      if (!user || !supabaseUser) {
        alert('Usuário não autenticado. Por favor, faça login novamente.');
        navigate('/login');
        return;
      }
      
      // Limpar formatação de documento e telefone
      const cleanDocument = formData.document.replace(/\D/g, '');
      const cleanPhone = formData.phone.replace(/\D/g, '');
      
      // Limpar formatação do documento do responsável, se aplicável
      const cleanResponsibleDocument = formData.responsible_document 
        ? formData.responsible_document.replace(/\D/g, '')
        : undefined;
      
      // Garantir que o tipo e status estão definidos
      const customerData = {
        ...formData,
        document: cleanDocument,
        phone: cleanPhone,
        type: formData.type || customerType,
        status: formData.status || 'active',
        // Tratar campos de data
        birth_date: customerType === 'individual' 
          ? (formData.birth_date && formData.birth_date.trim() !== '' ? formData.birth_date : undefined)
          : undefined,
        // Tratar campos específicos para pessoa jurídica
        responsible_document: customerType === 'business'
          ? (cleanResponsibleDocument || undefined)
          : undefined,
        responsible_name: customerType === 'business'
          ? (formData.responsible_name || undefined)
          : undefined,
        // Converter o endereço para o formato esperado pelo Supabase (jsonb)
        address: {
          street: formData.address.street,
          number: formData.address.number,
          complement: formData.address.complement || '',
          neighborhood: formData.address.neighborhood,
          city: formData.address.city,
          state: formData.address.state,
          zipCode: formData.address.zipCode,
          latitude: formData.address.latitude || undefined,
          longitude: formData.address.longitude || undefined
        }
      };
      
      console.log('Dados do cliente a serem enviados:', customerData);
      
      const newCustomer = await createCustomer(customerData);
      console.log('Cliente criado com sucesso:', newCustomer);
      
      setSuccessMessage('Cliente cadastrado com sucesso!');
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        onClose();
        navigate('/customers');
      }, 2000);
    } catch (error) {
      console.error('Error creating customer:', error);
      let errorMessage = 'Erro desconhecido ao criar cliente';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Verificar se é um erro relacionado a formato de data
      if (errorMessage.includes('invalid input syntax for type date')) {
        errorMessage = 'Formato de data inválido. Por favor, verifique o campo de data de nascimento.';
      }
      
      alert('Erro ao criar cliente: ' + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCepSearch = async () => {
    if (!formData.address.zipCode) return;

    try {
      setIsLoadingCep(true);
      const addressData = await searchCep(formData.address.zipCode);
      
      if (addressData) {
        // Atualizar o formulário com os dados do endereço
        setFormData({
          ...formData,
          address: {
            ...formData.address,
            street: addressData.logradouro || formData.address.street,
            neighborhood: addressData.bairro || formData.address.neighborhood,
            city: addressData.localidade || formData.address.city,
            state: addressData.uf || formData.address.state,
            // Não definimos latitude e longitude aqui, pois não vêm da API de CEP
          }
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      alert('Não foi possível encontrar o endereço para este CEP.');
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = e.target.value;
    
    // Atualizar o CEP no formulário
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        zipCode: cep
      }
    }));
    
    // Se o CEP for limpo ou alterado, limpar os campos de endereço
    if (!cep || cep.length < 8) {
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          street: '',
          neighborhood: '',
          city: '',
          state: '',
          zipCode: cep,
          latitude: undefined,
          longitude: undefined
        }
      }));
    }
  };

  const handleFindCTO = async () => {
    // Verificar se temos coordenadas para buscar o CTO mais próximo
    if (!formData.address.latitude || !formData.address.longitude) {
      alert('É necessário ter as coordenadas do endereço para encontrar o CTO mais próximo.');
      return;
    }

    try {
      setIsSearchingCTO(true);
      const cto = await findNearestCTO(formData.address.latitude, formData.address.longitude);
      setNearestCTO(cto);
    } catch (error) {
      console.error('Erro ao buscar CTO mais próximo:', error);
      alert('Não foi possível encontrar o CTO mais próximo.');
    } finally {
      setIsSearchingCTO(false);
    }
  };

  const handleMapClick = (e: any) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          latitude: lat,
          longitude: lng
        }
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      document: '',
      email: '',
      phone: '',
      type: customerType,
      status: 'active',
      birth_date: '',
      trade_name: '',
      state_registration: '',
      responsible_name: '',
      responsible_document: '',
      plan_id: '',
      address: {
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
        latitude: undefined,
        longitude: undefined
      }
    });
    setFormErrors({});
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="mr-4 text-gray-400 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Novo Cliente</h1>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tipo de Cliente
                </label>
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value as 'individual' | 'business')}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="individual">Pessoa Física</option>
                  <option value="business">Pessoa Jurídica</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nome {customerType === 'business' ? 'Fantasia' : 'Completo'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`mt-1 block w-full rounded-md ${formErrors['name'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm sm:text-sm`}
                />
                {formErrors['name'] && (
                  <p className="mt-1 text-sm text-red-600">{formErrors['name']}</p>
                )}
              </div>

              {customerType === 'business' && (
                <>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Razão Social
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.trade_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, trade_name: e.target.value }))}
                      className={`mt-1 block w-full rounded-md ${formErrors['trade_name'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm sm:text-sm`}
                    />
                    {formErrors['trade_name'] && (
                      <p className="mt-1 text-sm text-red-600">{formErrors['trade_name']}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Inscrição Estadual
                    </label>
                    <input
                      type="text"
                      value={formData.state_registration}
                      onChange={(e) => setFormData(prev => ({ ...prev, state_registration: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nome do Responsável
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.responsible_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, responsible_name: e.target.value }))}
                      className={`mt-1 block w-full rounded-md ${formErrors['responsible_name'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm sm:text-sm`}
                    />
                    {formErrors['responsible_name'] && (
                      <p className="mt-1 text-sm text-red-600">{formErrors['responsible_name']}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      CPF do Responsável
                    </label>
                    <FormattedInput
                      type="text"
                      required
                      value={formData.responsible_document}
                      onChange={(e) => setFormData(prev => ({ ...prev, responsible_document: e.target.value }))}
                      formatter={(value) => formatDocument(value, 'individual')}
                      unformatter={(value) => value.replace(/\D/g, '')}
                      maxRawLength={11}
                      className={`mt-1 block w-full rounded-md ${formErrors['responsible_document'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm sm:text-sm`}
                    />
                    {formErrors['responsible_document'] && (
                      <p className="mt-1 text-sm text-red-600">{formErrors['responsible_document']}</p>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {customerType === 'individual' ? 'CPF' : 'CNPJ'}
                </label>
                <FormattedInput
                  type="text"
                  required
                  value={formData.document}
                  onChange={(e) => setFormData(prev => ({ ...prev, document: e.target.value }))}
                  formatter={(value) => formatDocument(value, customerType)}
                  unformatter={(value) => value.replace(/\D/g, '')}
                  maxRawLength={customerType === 'individual' ? 11 : 14}
                  className={`mt-1 block w-full rounded-md ${formErrors['document'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm sm:text-sm`}
                />
                {formErrors['document'] && (
                  <p className="mt-1 text-sm text-red-600">{formErrors['document']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={`mt-1 block w-full rounded-md ${formErrors['email'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm sm:text-sm`}
                />
                {formErrors['email'] && (
                  <p className="mt-1 text-sm text-red-600">{formErrors['email']}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Telefone
                </label>
                <FormattedInput
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  formatter={formatPhone}
                  unformatter={(value) => value.replace(/\D/g, '')}
                  maxRawLength={11}
                  className={`mt-1 block w-full rounded-md ${formErrors['phone'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm sm:text-sm`}
                />
                {formErrors['phone'] && (
                  <p className="mt-1 text-sm text-red-600">{formErrors['phone']}</p>
                )}
              </div>

              {customerType === 'individual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={formData.birth_date || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                    className={`mt-1 block w-full rounded-md ${formErrors['birth_date'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm sm:text-sm`}
                  />
                  {formErrors['birth_date'] && (
                    <p className="mt-1 text-sm text-red-600">{formErrors['birth_date']}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Plano
                </label>
                <select
                  value={formData.plan_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, plan_id: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Selecione um plano</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Endereço</h3>
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Rua
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.street}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, street: e.target.value }
                    }))}
                    className={`mt-1 block w-full rounded-md ${formErrors['address.street'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} shadow-sm sm:text-sm`}
                  />
                  {formErrors['address.street'] && (
                    <p className="mt-1 text-sm text-red-600">{formErrors['address.street']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Número
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.number}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, number: e.target.value }
                    }))}
                    className={`mt-1 block w-full rounded-md ${formErrors['address.number'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} shadow-sm sm:text-sm`}
                  />
                  {formErrors['address.number'] && (
                    <p className="mt-1 text-sm text-red-600">{formErrors['address.number']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={formData.address.complement}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, complement: e.target.value }
                    }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Bairro
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.neighborhood}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, neighborhood: e.target.value }
                    }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cidade
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Estado
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.state}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, state: e.target.value }
                    }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Coordenadas
                      </label>
                      <div className="mt-1 grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Latitude"
                          value={formData.address.latitude || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d.-]/g, '');
                            setFormData(prev => ({
                              ...prev,
                              address: { ...prev.address, latitude: value ? parseFloat(value) : undefined }
                            }));
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Longitude"
                          value={formData.address.longitude || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d.-]/g, '');
                            setFormData(prev => ({
                              ...prev,
                              address: { ...prev.address, longitude: value ? parseFloat(value) : undefined }
                            }));
                          }}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex-grow mr-2">
                    <label className="block text-sm font-medium text-gray-700">
                      CEP
                    </label>
                    <FormattedInput
                      type="text"
                      required
                      value={formData.address.zipCode}
                      onChange={handleCepChange}
                      formatter={formatZipCode}
                      unformatter={(value) => value.replace(/\D/g, '')}
                      maxRawLength={8}
                      className={`mt-1 block w-full rounded-md ${formErrors['address.zipCode'] ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'} shadow-sm sm:text-sm`}
                    />
                    {formErrors['address.zipCode'] && (
                      <p className="mt-1 text-sm text-red-600">{formErrors['address.zipCode']}</p>
                    )}
                  </div>
                  <div className="flex-none pt-6">
                    <button
                      type="button"
                      onClick={handleCepSearch}
                      disabled={isLoadingCep || !formData.address.zipCode || formData.address.zipCode.length < 8}
                      className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {isLoadingCep ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Search className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CTO Search */}
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900">CTO</h3>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleFindCTO}
                  disabled={isSearchingCTO || !formData.address.latitude || !formData.address.longitude}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isSearchingCTO ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Network className="h-4 w-4 mr-2" />
                      Buscar CTO Próxima
                    </>
                  )}
                </button>

                {nearestCTO && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">CTO Encontrada</h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{nearestCTO.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-300">{nearestCTO.address}</p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
                      Portas: {nearestCTO.used_ports}/{nearestCTO.total_ports}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`inline-flex justify-center rounded-md border border-transparent ${
                  isSubmitting ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'
                } py-2 px-4 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
              >
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}