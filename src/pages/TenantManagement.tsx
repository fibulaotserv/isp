import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Building2,
  Plus,
  Search,
  Loader2,
  Settings,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Network,
  Globe,
  Users,
  Package
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import type { Tenant } from '../types/tenant';

export default function TenantManagement() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'network' | 'users'>('info');
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    cnpj: '',
    contact_email: '',
    contact_phone: '',
    custom_domain: '',
    max_customers: 100,
    plan_type: 'basic' as 'basic' | 'professional' | 'enterprise',
    network: {
      ipRanges: [] as string[],
      dns: {
        primary: '8.8.8.8',
        secondary: '8.8.4.4'
      },
      vlans: [] as number[],
      authType: 'pppoe' as 'pppoe' | 'ipoe' | 'static'
    }
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('name');

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error loading tenants:', error);
      alert('Erro ao carregar empresas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('tenants')
        .upsert({
          id: selectedTenant?.id,
          name: formData.name,
          legal_name: formData.legal_name,
          cnpj: formData.cnpj,
          contact_email: formData.contact_email || null,
          contact_phone: formData.contact_phone || null,
          custom_domain: formData.custom_domain || null,
          max_customers: formData.max_customers,
          plan_type: formData.plan_type,
          settings: {
            allowMFA: selectedTenant?.settings?.allowMFA ?? false,
            maxAdmins: selectedTenant?.settings?.maxAdmins ?? 3,
            maxOperators: selectedTenant?.settings?.maxOperators ?? 10,
            network: formData.network
          }
        });

      if (error) throw error;
      
      setShowModal(false);
      setSelectedTenant(null);
      await loadTenants();
    } catch (error) {
      console.error('Error saving tenant:', error);
      alert('Erro ao salvar empresa');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa?')) return;

    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadTenants();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      alert('Erro ao excluir empresa');
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.cnpj.includes(searchQuery)
  );

  if (!user || user.role !== 'master') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Acesso não autorizado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Building2 className="h-6 w-6 text-indigo-600" />
              <h1 className="ml-2 text-2xl font-semibold text-gray-900">Empresas</h1>
            </div>
            <button
              onClick={() => {
                setSelectedTenant(null);
                setShowModal(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Empresa
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nome ou CNPJ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="absolute right-3 top-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Tenants List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empresa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CNPJ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plano
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {tenant.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {tenant.contact_email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tenant.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {tenant.plan_type.charAt(0).toUpperCase() + tenant.plan_type.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tenant.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {tenant.active ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-1" />
                          Inativo
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setFormData({
                          name: tenant.name || '',
                          legal_name: tenant.legal_name || '',
                          cnpj: tenant.cnpj || '',
                          contact_email: tenant.contact_email || '',
                          contact_phone: tenant.contact_phone || '',
                          custom_domain: tenant.custom_domain || '',
                          max_customers: tenant.max_customers || 100,
                          plan_type: tenant.plan_type || 'basic',
                          network: tenant.settings?.network ?? {
                            ipRanges: [],
                            dns: {
                              primary: '8.8.8.8',
                              secondary: '8.8.4.4'
                            },
                            vlans: [],
                            authType: 'pppoe'
                          }
                        });
                        setShowModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(tenant.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedTenant ? 'Editar Empresa' : 'Nova Empresa'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedTenant(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              {/* Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`${
                      activeTab === 'info'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Informações
                  </button>
                  <button
                    onClick={() => setActiveTab('network')}
                    className={`${
                      activeTab === 'network'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <Network className="w-4 h-4 mr-2" />
                    Rede
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`${
                      activeTab === 'users'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Usuários
                  </button>
                </nav>
              </div>

              <form onSubmit={handleSubmit}>
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Nome Fantasia
                        </label>
                        <input
                          type="text"
                          name="name"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Razão Social
                        </label>
                        <input
                          type="text"
                          name="legal_name"
                          required
                          value={formData.legal_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, legal_name: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          CNPJ
                        </label>
                        <input
                          type="text"
                          name="cnpj"
                          required
                          maxLength={14}
                          value={formData.cnpj}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setFormData(prev => ({ ...prev, cnpj: value }));
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Email de Contato
                        </label>
                        <input
                          type="email"
                          name="contact_email"
                          required
                          value={formData.contact_email}
                          onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Telefone de Contato
                        </label>
                        <input
                          type="text"
                          name="contact_phone"
                          required
                          maxLength={11}
                          value={formData.contact_phone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setFormData(prev => ({ ...prev, contact_phone: value }));
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Domínio Personalizado
                          <span className="text-gray-500 text-xs ml-1">(opcional)</span>
                        </label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                          <input
                            type="text"
                            name="custom_domain"
                            placeholder="exemplo.com.br"
                            value={formData.custom_domain}
                            onChange={(e) => setFormData(prev => ({ ...prev, custom_domain: e.target.value }))}
                            className="flex-1 rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                          <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                            <Globe className="h-4 w-4" />
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Plano
                        </label>
                        <select
                          name="plan_type"
                          required
                          value={formData.plan_type}
                          onChange={(e) => setFormData(prev => ({ ...prev, plan_type: e.target.value as any }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="basic">Básico</option>
                          <option value="professional">Profissional</option>
                          <option value="enterprise">Empresarial</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Limite de Clientes
                        </label>
                        <input
                          type="number"
                          name="max_customers"
                          required
                          min="1"
                          value={formData.max_customers}
                          onChange={(e) => setFormData(prev => ({ ...prev, max_customers: parseInt(e.target.value) }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'network' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Tipo de Autenticação
                      </label>
                      <select
                        name="authType"
                        required
                        value={formData.network.authType}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          network: {
                            ...prev.network,
                            authType: e.target.value as any
                          }
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      >
                        <option value="pppoe">PPPoE</option>
                        <option value="ipoe">IPoE</option>
                        <option value="static">IP Estático</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Faixas de IP
                      </label>
                      <div className="mt-1 space-y-2">
                        {formData.network.ipRanges.map((range, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={range}
                              onChange={(e) => {
                                const newRanges = [...formData.network.ipRanges];
                                newRanges[index] = e.target.value;
                                setFormData(prev => ({
                                  ...prev,
                                  network: {
                                    ...prev.network,
                                    ipRanges: newRanges
                                  }
                                }));
                              }}
                              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newRanges = formData.network.ipRanges.filter((_, i) => i !== index);
                                setFormData(prev => ({
                                  ...prev,
                                  network: {
                                    ...prev.network,
                                    ipRanges: newRanges
                                  }
                                }));
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              network: {
                                ...prev.network,
                                ipRanges: [...prev.network.ipRanges, '']
                              }
                            }));
                          }}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Faixa
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          DNS Primário
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.network.dns.primary}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            network: {
                              ...prev.network,
                              dns: {
                                ...prev.network.dns,
                                primary: e.target.value
                              }
                            }
                          }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          DNS Secundário
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.network.dns.secondary}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            network: {
                              ...prev.network,
                              dns: {
                                ...prev.network.dns,
                                secondary: e.target.value
                              }
                            }
                          }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        VLANs
                      </label>
                      <div className="mt-1 space-y-2">
                        {formData.network.vlans.map((vlan, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="1"
                              max="4094"
                              value={vlan}
                              onChange={(e) => {
                                const newVlans = [...formData.network.vlans];
                                newVlans[index] = parseInt(e.target.value);
                                setFormData(prev => ({
                                  ...prev,
                                  network: {
                                    ...prev.network,
                                    vlans: newVlans
                                  }
                                }));
                              }}
                              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newVlans = formData.network.vlans.filter((_, i) => i !== index);
                                setFormData(prev => ({
                                  ...prev,
                                  network: {
                                    ...prev.network,
                                    vlans: newVlans
                                  }
                                }));
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              network: {
                                ...prev.network,
                                vlans: [...prev.network.vlans, 1]
                              }
                            }));
                          }}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar VLAN
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'users' && (
                  <div className="space-y-6">
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Users className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            O gerenciamento de usuários está disponível após salvar a empresa.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-900">Limites do Plano</h4>
                      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Administradores</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formData.plan_type === 'basic' ? '3' :
                               formData.plan_type === 'professional' ? '5' : '10'}
                            </span>
                          </div>
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: '0%' }}
                            />
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Operadores</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formData.plan_type === 'basic' ? '10' :
                               formData.plan_type === 'professional' ? '20' : '50'}
                            </span>
                          </div>
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full"
                              style={{ width: '0%' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedTenant(null);
                    }}
                    className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    {selectedTenant ? 'Salvar Alterações' : 'Criar Empresa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}