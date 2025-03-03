import { supabase } from '../lib/supabase';
import type { Tenant } from '../types/tenant';

export async function getTenant(): Promise<Tenant> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const tenant_id = user.user_metadata?.tenant_id;
  if (!tenant_id) {
    throw new Error('ID do tenant não encontrado');
  }

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenant_id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Tenant não encontrado');
    }
    throw new Error(`Erro ao carregar dados da empresa: ${error.message}`);
  }

  if (!data) {
    throw new Error('Tenant não encontrado');
  }

  return data as Tenant;
}

export async function getTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching tenants:', error);
    throw new Error('Erro ao carregar empresas');
  }

  return data || [];
}

export async function createTenant(tenantData: Omit<Tenant, 'id' | 'createdAt'>): Promise<Tenant> {
  const { data, error } = await supabase
    .from('tenants')
    .insert([tenantData])
    .select()
    .single();

  if (error) {
    console.error('Error creating tenant:', error);
    throw new Error('Erro ao criar empresa');
  }

  return data;
}

export async function updateTenantById(
  id: string,
  tenantData: Partial<Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Tenant> {
  const { data, error } = await supabase
    .from('tenants')
    .update(tenantData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating tenant:', error);
    throw new Error('Erro ao atualizar empresa');
  }

  return data;
}

export async function deleteTenant(id: string): Promise<void> {
  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting tenant:', error);
    throw new Error('Erro ao excluir empresa');
  }

  if (error) {
    console.error('Error updating tenant:', error);
    throw new Error('Erro ao atualizar dados da empresa');
  }
}

export async function updateTenantSettings(data: {
  name: string;
  cnpj: string;
  settings: {
    allowMFA: boolean;
    maxAdmins: number;
    maxOperators: number;
  };
}): Promise<void> {
  const { error } = await supabase.rpc('update_tenant_settings', {
    new_name: data.name,
    new_cnpj: data.cnpj,
    new_settings: data.settings
  });

  if (error) {
    console.error('Error updating tenant settings:', error);
    throw new Error('Erro ao atualizar configurações da empresa');
  }
}

export async function updateTenantLogo(logoBase64: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const tenant_id = user.user_metadata?.tenant_id;
  if (!tenant_id) {
    throw new Error('ID do tenant não encontrado');
  }

  const { error } = await supabase.rpc('update_tenant_logo', {
    new_logo_url: logoBase64
  });

  if (error) {
    console.error('Error updating tenant logo:', error);
    throw new Error('Erro ao atualizar logo da empresa');
  }
}

export {
  updateTenantById as updateTenant
};