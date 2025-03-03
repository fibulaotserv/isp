import { supabase } from '../lib/supabase';
import type { User, UserRole } from '../types/auth';

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, tenant_id, mfa_enabled')
    .order('name');

  if (error) {
    console.error('Error fetching users:', error);
    throw new Error('Erro ao buscar usuários');
  }

  return data.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    tenant_id: user.tenant_id,
    mfaEnabled: user.mfa_enabled
  }));
}

export async function createUser(userData: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}) {
  const { data, error } = await supabase.rpc('create_user', {
    user_email: userData.email,
    user_password: userData.password,
    user_name: userData.name,
    user_role: userData.role
  });

  if (error) {
    console.error('Error creating user:', error);
    throw new Error('Erro ao criar usuário');
  }

  return data;
}

export async function updateUserPassword(userId: string, newPassword: string) {
  const { error } = await supabase.rpc('change_user_password', {
    user_id: userId,
    new_password: newPassword
  });

  if (error) {
    console.error('Error updating password:', error);
    throw new Error('Erro ao atualizar senha');
  }
}

export async function updateUserRole(userId: string, role: UserRole) {
  const { error } = await supabase.rpc('update_user_role', {
    user_id: userId,
    new_role: role
  });

  if (error) {
    console.error('Error updating role:', error);
    throw new Error('Erro ao atualizar função');
  }
}