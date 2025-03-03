import { supabase } from '../lib/supabase';
import type { CTO, CTOGroup } from '../types/network';

interface MapLocation {
  latitude: number;
  longitude: number;
  zoom?: number;
}

export async function getLastMapLocation(): Promise<MapLocation | null> {
  const { data, error } = await supabase
    .from('map_locations')
    .select()
    .order('created_at', { ascending: false })
    .limit(1);

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching last location:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0] as unknown as MapLocation;
}

export async function saveMapLocation(location: MapLocation): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('User not authenticated');
    return;
  }

  const tenant_id = user.user_metadata?.tenant_id;
  if (!tenant_id) {
    console.error('Tenant ID not found');
    return;
  }

  const { error } = await supabase
    .from('map_locations')
    .insert([{
      latitude: location.latitude,
      longitude: location.longitude,
      zoom: location.zoom || 13,
      tenant_id
    }]);

  if (error) {
    console.error('Error saving location:', error);
  }
}
export async function findNearestCTO(latitude: number, longitude: number): Promise<CTO | null> {
  const { data, error } = await supabase.rpc('find_nearest_cto', {
    p_latitude: latitude,
    p_longitude: longitude
  });

  if (error) {
    console.error('Error finding nearest CTO:', error);
    throw new Error('Erro ao buscar CTO mais próxima');
  }

  return data;
}

export async function updateCTO(id: string, ctoData: Partial<Omit<CTO, 'id' | 'tenant_id'>>): Promise<CTO> {
  const { data, error } = await supabase
    .from('ctos')
    .update(ctoData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating CTO:', error);
    throw new Error('Erro ao atualizar CTO');
  }

  return data as unknown as CTO;
}
export async function associateCustomerWithCTO(customerId: string, ctoId: string): Promise<void> {
  const { error } = await supabase.rpc('associate_customer_cto', {
    p_customer_id: customerId,
    p_cto_id: ctoId
  });

  if (error) {
    console.error('Error associating customer with CTO:', error);
    throw new Error('Erro ao associar cliente à CTO');
  }
}

export async function getCTOs(): Promise<CTO[]> {
  const { data, error } = await supabase
    .from('ctos')
    .select(`
      *,
      group:group_id (
        id,
        name,
        color
      )
    `)
    .order('name');

  if (error) {
    console.error('Error fetching CTOs:', error);
    throw new Error('Erro ao buscar CTOs');
  }

  return (data || []) as unknown as CTO[];
}

export async function createCTO(ctoData: Omit<CTO, 'id'>): Promise<CTO> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const tenant_id = user.user_metadata?.tenant_id;
  if (!tenant_id) {
    throw new Error('Tenant não encontrado');
  }

  const { data, error } = await supabase
    .from('ctos')
    .insert([{
      ...ctoData,
      tenant_id
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating CTO:', error);
    throw new Error('Erro ao criar CTO');
  }

  return data as unknown as CTO;
}

export async function getCTOGroups(): Promise<CTOGroup[]> {
  const { data, error } = await supabase
    .from('cto_groups')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching CTO groups:', error);
    throw new Error('Erro ao buscar grupos de CTO');
  }

  return (data || []) as unknown as CTOGroup[];
}

export async function createCTOGroup(groupData: Omit<CTOGroup, 'id' | 'tenant_id'>): Promise<CTOGroup> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const tenant_id = user.user_metadata?.tenant_id;
  if (!tenant_id) {
    throw new Error('Tenant não encontrado');
  }

  const { data, error } = await supabase
    .from('cto_groups')
    .insert([{
      ...groupData,
      tenant_id
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating CTO group:', error);
    throw new Error('Erro ao criar grupo de CTO');
  }

  return data as unknown as CTOGroup;
}

export async function updateCTOGroup(id: string, groupData: Partial<Omit<CTOGroup, 'id' | 'tenant_id'>>): Promise<CTOGroup> {
  const { data, error } = await supabase
    .from('cto_groups')
    .update(groupData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating CTO group:', error);
    throw new Error('Erro ao atualizar grupo de CTO');
  }

  return data as unknown as CTOGroup;
}

export async function deleteCTOGroup(id: string): Promise<void> {
  const { error } = await supabase
    .from('cto_groups')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting CTO group:', error);
    throw new Error('Erro ao excluir grupo de CTO');
  }
}