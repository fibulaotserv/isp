import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Upload, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getTenant, updateTenantLogo, updateTenant } from '../services/tenantService';
import type { Tenant } from '../types/tenant';

export default function Settings() {
  const { user } = useAuthStore();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    settings: {
      allowMFA: false,
      maxAdmins: 3,
      maxOperators: 10
    }
  });

  useEffect(() => {
    loadTenant();
  }, []);

  const loadTenant = async () => {
    try {
      setIsLoading(true);
      const tenantData = await getTenant();
      if (tenantData) {
        setTenant(tenantData);
        setFormData({
          name: tenantData.name || '',
          cnpj: tenantData.cnpj || '',
          settings: {
            allowMFA: tenantData.settings?.allowMFA || false,
            maxAdmins: tenantData.settings?.maxAdmins || 3,
            maxOperators: tenantData.settings?.maxOperators || 10
          }
        });
      }
    } catch (error) {
      console.error('Error loading tenant:', error);
      setError('Erro ao carregar dados da empresa');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      e.target.value = '';
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida');
      e.target.value = '';
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 2MB');
      e.target.value = '';
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      
      // Create a new FileReader
      await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64String = reader.result as string;
            await updateTenantLogo(base64String);
            await loadTenant();
            resolve(null);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      setError('Erro ao fazer upload da logo');
      e.target.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [name]: type === 'checkbox' ? checked : parseInt(value)
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setError('');
      await updateTenant(formData);
      await loadTenant();
      setError('');
    } catch (error) {
      console.error('Error updating tenant:', error);
      setError('Erro ao atualizar dados da empresa');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

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
          <div className="flex items-center">
            <SettingsIcon className="h-6 w-6 text-indigo-600" />
            <h1 className="ml-2 text-2xl font-semibold text-gray-900">Configurações</h1>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Personalização
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Personalize a aparência do sistema
            </p>
          </div>

          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Logo da Empresa
                </label>
                <div className="mt-2 flex items-center space-x-6">
                  <div className="flex-shrink-0 h-24 w-24 bg-gray-100 rounded-lg overflow-hidden">
                    {tenant?.logo_url ? (
                      <img
                        src={tenant.logo_url + '?' + new Date().getTime()}
                        alt="Logo"
                        className="h-24 w-24 object-contain"
                      />
                    ) : (
                      <div className="h-24 w-24 flex items-center justify-center text-gray-400">
                        <SettingsIcon className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                    <span className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Alterar Logo
                        </>
                      )}
                    </span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isUploading}
                    />
                  </label>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  PNG ou JPG até 2MB. A logo será exibida na tela de login e no painel.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Dados da Empresa
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Informações básicas e configurações
            </p>
          </div>

          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome da Empresa
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
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
                    value={formData.cnpj}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Configurações Avançadas
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="allowMFA"
                      checked={formData.settings.allowMFA}
                      onChange={handleSettingsChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Habilitar Autenticação em Dois Fatores (MFA)
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Número Máximo de Administradores
                    </label>
                    <input
                      type="number"
                      name="maxAdmins"
                      min="1"
                      max="10"
                      value={formData.settings.maxAdmins}
                      onChange={handleSettingsChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Número Máximo de Operadores
                    </label>
                    <input
                      type="number"
                      name="maxOperators"
                      min="1"
                      max="50"
                      value={formData.settings.maxOperators}
                      onChange={handleSettingsChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}