import { supabase } from '../lib/supabase';
import type { Plan } from '../types/plan';

export async function getPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching plans:', error);
    throw new Error('Erro ao buscar planos');
  }

  return data || [];
}

export async function createPlan(plan: Omit<Plan, 'id' | 'created_at' | 'updated_at'>): Promise<Plan> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const tenant_id = user.user_metadata?.tenant_id;
  if (!tenant_id) {
    throw new Error('Tenant not found');
  }

  const { data, error } = await supabase
    .from('plans')
    .insert([{
      ...plan,
      tenant_id
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating plan:', error);
    throw new Error('Erro ao criar plano');
  }

  return data;
}

export async function updatePlan(id: string, plan: Partial<Omit<Plan, 'id' | 'created_at' | 'updated_at'>>): Promise<Plan> {
  const { data, error } = await supabase
    .from('plans')
    .update(plan)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating plan:', error);
    throw new Error('Erro ao atualizar plano');
  }

  return data;
}

export async function deletePlan(id: string): Promise<void> {
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting plan:', error);
    throw new Error('Erro ao excluir plano');
  }
}