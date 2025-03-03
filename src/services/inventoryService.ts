import { supabase } from '../lib/supabase';
import type { 
  InventoryItem, 
  InventoryCategory, 
  InventorySupplier, 
  InventoryTransaction,
  InventoryItemFormData
} from '../types/inventory';

// Funções para itens de estoque
export async function getInventoryItems(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching inventory items:', error);
    throw new Error(`Erro ao buscar itens do estoque: ${error.message}`);
  }

  return data || [];
}

export async function getInventoryItem(id: string): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching inventory item:', error);
    throw new Error(`Erro ao buscar item do estoque: ${error.message}`);
  }

  return data;
}

export async function createInventoryItem(item: InventoryItemFormData): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory_items')
    .insert([item])
    .select()
    .single();

  if (error) {
    console.error('Error creating inventory item:', error);
    throw new Error(`Erro ao criar item do estoque: ${error.message}`);
  }

  return data;
}

export async function updateInventoryItem(id: string, item: Partial<InventoryItemFormData>): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory_items')
    .update(item)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating inventory item:', error);
    throw new Error(`Erro ao atualizar item do estoque: ${error.message}`);
  }

  return data;
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting inventory item:', error);
    throw new Error(`Erro ao excluir item do estoque: ${error.message}`);
  }
}

// Funções para categorias
export async function getInventoryCategories(): Promise<InventoryCategory[]> {
  const { data, error } = await supabase
    .from('inventory_categories')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching inventory categories:', error);
    throw new Error(`Erro ao buscar categorias do estoque: ${error.message}`);
  }

  return data || [];
}

export async function createInventoryCategory(category: Omit<InventoryCategory, 'id' | 'tenant_id'>): Promise<InventoryCategory> {
  const { data, error } = await supabase
    .from('inventory_categories')
    .insert([category])
    .select()
    .single();

  if (error) {
    console.error('Error creating inventory category:', error);
    throw new Error(`Erro ao criar categoria do estoque: ${error.message}`);
  }

  return data;
}

// Funções para fornecedores
export async function getInventorySuppliers(): Promise<InventorySupplier[]> {
  const { data, error } = await supabase
    .from('inventory_suppliers')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching inventory suppliers:', error);
    throw new Error(`Erro ao buscar fornecedores: ${error.message}`);
  }

  return data || [];
}

export async function createInventorySupplier(supplier: Omit<InventorySupplier, 'id' | 'tenant_id'>): Promise<InventorySupplier> {
  const { data, error } = await supabase
    .from('inventory_suppliers')
    .insert([supplier])
    .select()
    .single();

  if (error) {
    console.error('Error creating inventory supplier:', error);
    throw new Error(`Erro ao criar fornecedor: ${error.message}`);
  }

  return data;
}

// Função para criar um fornecedor padrão se não existir nenhum
export async function ensureDefaultSupplier(): Promise<InventorySupplier> {
  const suppliers = await getInventorySuppliers();
  
  if (suppliers.length > 0) {
    return suppliers[0];
  }
  
  // Criar fornecedor padrão
  return createInventorySupplier({
    name: 'Fornecedor Padrão',
    contact_name: 'Administrador',
    email: 'admin@exemplo.com',
    phone: '(00) 00000-0000',
    address: 'Endereço padrão'
  });
}

// Função para criar uma categoria padrão se não existir nenhuma
export async function ensureDefaultCategory(): Promise<InventoryCategory> {
  const categories = await getInventoryCategories();
  
  if (categories.length > 0) {
    return categories[0];
  }
  
  // Criar categoria padrão
  return createInventoryCategory({
    name: 'Geral',
    description: 'Categoria padrão para itens diversos'
  });
}

// Funções para transações de estoque
export async function createInventoryTransaction(transaction: Omit<InventoryTransaction, 'id' | 'created_at' | 'tenant_id'>): Promise<InventoryTransaction> {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .insert([transaction])
    .select()
    .single();

  if (error) {
    console.error('Error creating inventory transaction:', error);
    throw new Error(`Erro ao registrar transação de estoque: ${error.message}`);
  }

  return data;
}

export async function getItemTransactions(itemId: string): Promise<InventoryTransaction[]> {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching item transactions:', error);
    throw new Error(`Erro ao buscar transações do item: ${error.message}`);
  }

  return data || [];
}

// Função para buscar itens de estoque
export async function searchInventoryItems(query: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .or(`name.ilike.%${query}%,sku.ilike.%${query}%,description.ilike.%${query}%,brand.ilike.%${query}%,model.ilike.%${query}%,mac_address.ilike.%${query}%,serial_number.ilike.%${query}%`)
    .order('name');

  if (error) {
    console.error('Error searching inventory items:', error);
    throw new Error(`Erro ao buscar itens do estoque: ${error.message}`);
  }

  return data || [];
}

// Função para verificar itens com estoque baixo
export async function getLowStockItems(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .lt('quantity', supabase.raw('min_quantity'))
    .order('name');

  if (error) {
    console.error('Error fetching low stock items:', error);
    throw new Error(`Erro ao buscar itens com estoque baixo: ${error.message}`);
  }

  return data || [];
} 