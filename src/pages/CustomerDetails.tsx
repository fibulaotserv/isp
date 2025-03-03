import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, Network, Edit, Save, X } from 'lucide-react';
import type { Customer } from '../types/customer';
import type { Plan } from '../types/plan';
import type { CTO } from '../types/network';
import { getCustomer, updateCustomer } from '../services/customerService';
import { getPlans } from '../services/planService';
import { generateInvoice } from '../services/billingService';
import { findNearestCTO } from '../services/networkService';
import FormattedInput from '../components/FormattedInput';
import { formatDocument, formatPhone, formatCoordinates } from '../utils/formatters';

export default function CustomerDetails() {
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isSearchingCTO, setIsSearchingCTO] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [editData, setEditData] = useState<Partial<Customer>>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [nearestCTO, setNearestCTO] = useState<CTO | null>(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      loadCustomer();
      loadPlans();
    }
  }, [id]);

  const loadCustomer = async () => {
    try {
      if (!id) return;
      const data = await getCustomer(id);
      setCustomer(data);
      setEditData(data);
    } catch (error) {
      console.error('Error loading customer:', error);
    }
  };

  const handleSave = async () => {
    if (!customer || !editData) return;
    
    try {
      setIsSaving(true);
      await updateCustomer(customer.id, editData);
      await loadCustomer();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Erro ao atualizar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const loadPlans = async () => {
    try {
      const data = await getPlans();
      setPlans(data);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!customer) return;
    
    try {
      setIsGeneratingInvoice(true);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 5); // Due in 5 days
      
      await generateInvoice(
        customer.id,
        dueDate.toISOString().split('T')[0],
        'slip'
      );
      
      alert('Fatura gerada com sucesso!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Erro ao gerar fatura');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleFindCTO = async () => {
    if (!customer?.address?.latitude || !customer?.address?.longitude) {
      alert('Endereço sem coordenadas');
      return;
    }

    try {
      setIsSearchingCTO(true);
      const latitude = parseFloat(customer.address.latitude.toString());
      const longitude = parseFloat(customer.address.longitude.toString());
      
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error('Coordenadas inválidas');
      }
      
      const cto = await findNearestCTO(latitude, longitude);
      setNearestCTO(cto);
      
      if (!cto) {
        alert('Nenhuma CTO encontrada próxima a esta localização');
      }
    } catch (error) {
      console.error('Error finding CTO:', error);
      alert('Erro ao buscar CTO próxima');
    } finally {
      setIsSearchingCTO(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {customer ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <button
                  onClick={() => navigate(-1)}
                  className="mr-4 text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-2xl font-semibold text-gray-900">{customer.name}</h1>
              </div>
              <div className="flex space-x-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditData(customer);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </button>
                    <button
                      onClick={handleGenerateInvoice}
                      disabled={isGeneratingInvoice || !customer.plan_id}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingInvoice ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Gerar Fatura
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-6 py-5">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Detalhes do Cliente
                </h3>
              </div>
              <div className="border-t border-gray-200 px-6 py-5">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Tipo</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {customer.type === 'individual' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Documento</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {isEditing ? (
                        <FormattedInput
                          type="text"
                          value={editData.document || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, document: e.target.value }))}
                          formatter={(value) => formatDocument(value, customer.type)}
                          unformatter={(value) => value.replace(/\D/g, '')}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      ) : (
                        formatDocument(customer.document, customer.type)
                      )}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {isEditing ? (
                        <input
                          type="email"
                          value={editData.email || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      ) : (
                        customer.email
                      )}
                    </dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {isEditing ? (
                        <FormattedInput
                          type="text"
                          value={editData.phone || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                          formatter={formatPhone}
                          unformatter={(value) => value.replace(/\D/g, '')}
                          maxRawLength={11}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      ) : (
                        formatPhone(customer.phone)
                      )}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Plano</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {isEditing ? (
                        <select
                          value={editData.plan_id || ''}
                          onChange={(e) => setEditData(prev => ({ ...prev, plan_id: e.target.value }))}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="">Selecione um plano</option>
                          {plans.map(plan => (
                            <option key={plan.id} value={plan.id}>{plan.name}</option>
                          ))}
                        </select>
                      ) : (
                        customer.plan_id ? (
                          plans.find(p => p.id === customer.plan_id)?.name || 'Plano não encontrado'
                        ) : (
                          'Nenhum plano selecionado'
                        )
                      )}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Endereço</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {isEditing ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <input
                              type="text"
                              placeholder="Rua"
                              value={editData.address?.street || ''}
                              onChange={(e) => setEditData(prev => ({
                                ...prev,
                                address: { ...prev.address, street: e.target.value }
                              }))}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="Número"
                              value={editData.address?.number || ''}
                              onChange={(e) => setEditData(prev => ({
                                ...prev,
                                address: { ...prev.address, number: e.target.value }
                              }))}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="Complemento"
                              value={editData.address?.complement || ''}
                              onChange={(e) => setEditData(prev => ({
                                ...prev,
                                address: { ...prev.address, complement: e.target.value }
                              }))}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="Bairro"
                              value={editData.address?.neighborhood || ''}
                              onChange={(e) => setEditData(prev => ({
                                ...prev,
                                address: { ...prev.address, neighborhood: e.target.value }
                              }))}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="Cidade"
                              value={editData.address?.city || ''}
                              onChange={(e) => setEditData(prev => ({
                                ...prev,
                                address: { ...prev.address, city: e.target.value }
                              }))}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="Estado"
                              value={editData.address?.state || ''}
                              onChange={(e) => setEditData(prev => ({
                                ...prev,
                                address: { ...prev.address, state: e.target.value }
                              }))}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="CEP"
                              value={editData.address?.zipCode || ''}
                              onChange={(e) => setEditData(prev => ({
                                ...prev,
                                address: { ...prev.address, zipCode: e.target.value }
                              }))}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          {customer.address.street}, {customer.address.number}
                          {customer.address.complement && ` - ${customer.address.complement}`}
                          <br />
                          {customer.address.neighborhood} - {customer.address.city}/{customer.address.state}
                          <br />
                          CEP: {customer.address.zipCode}
                        </>
                      )}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-700 mb-2">CTO</dt>
                    <dd className="mt-1">
                      <div className="text-sm font-medium text-gray-700 mb-2">Coordenadas</div>
                      <div className="mt-1">
                        {isEditing ? (
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Latitude"
                              value={editData.address?.latitude || ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^\d.-]/g, '');
                                setEditData(prev => ({
                                  ...prev,
                                  address: { ...prev.address, latitude: value ? parseFloat(value) : undefined }
                                }));
                              }}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Longitude"
                              value={editData.address?.longitude || ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^\d.-]/g, '');
                                setEditData(prev => ({
                                  ...prev,
                                  address: { ...prev.address, longitude: value ? parseFloat(value) : undefined }
                                }));
                              }}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            {customer.address?.latitude && customer.address?.longitude ? (
                              `${formatCoordinates(customer.address.latitude)}, ${formatCoordinates(customer.address.longitude)}`
                            ) : (
                              'Não definidas'
                            )}
                          </div>
                        )}
                      </div>
                      {customer.address?.latitude && customer.address?.longitude ? (
                        <div className="text-sm text-gray-500 mb-2">
                          Coordenadas: {formatCoordinates(customer.address.latitude)}, {formatCoordinates(customer.address.longitude)}
                        </div>
                      ) : (
                        <div className="text-sm text-red-500 mb-2">
                          Endereço sem coordenadas cadastradas
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleFindCTO}
                        disabled={isSearchingCTO || !customer.address?.latitude || !customer.address?.longitude}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
                        <div className="mt-4 p-4 bg-gray-50 rounded-md">
                          <h4 className="text-sm font-medium text-gray-900">CTO Encontrada</h4>
                          <p className="mt-1 text-sm text-gray-500">{nearestCTO.name}</p>
                          <p className="text-sm text-gray-500">{nearestCTO.address}</p>
                          <p className="mt-2 text-sm text-gray-500">
                            Portas: {nearestCTO.used_ports}/{nearestCTO.total_ports}
                          </p>
                        </div>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        )}
      </div>
    </div>
  );
}