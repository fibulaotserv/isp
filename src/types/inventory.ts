export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  quantity: number;
  min_quantity: number;
  cost_price: number;
  sale_price: number;
  supplier: string;
  location: string;
  last_purchase_date: string | null;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  
  // Campos específicos para provedores de internet
  item_type?: 'onu' | 'router' | 'cable' | 'connector' | 'other';
  brand?: string;
  model?: string;
  mac_address?: string;
  serial_number?: string;
  
  // Específico para cabos
  cable_length?: number;
  cable_type?: string;
  
  // Específico para conectores
  connector_type?: 'UPC' | 'APC';
}

// Novo tipo para representar os diferentes tipos de itens
export interface NetworkEquipment {
  id: string;
  inventory_item_id: string;
  equipment_type: 'onu' | 'router' | 'modem';
  brand: string;
  model: string;
  mac_address: string;
  serial_number: string;
  firmware_version?: string;
  ip_address?: string;
  tenant_id: string;
}

export interface CableInventory {
  id: string;
  inventory_item_id: string;
  cable_type: string;
  length: number; // em metros
  color?: string;
  tenant_id: string;
}

export interface ConnectorInventory {
  id: string;
  inventory_item_id: string;
  connector_type: 'UPC' | 'APC';
  tenant_id: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
}

export interface InventorySupplier {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  tenant_id: string;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  type: 'in' | 'out';
  quantity: number;
  reason: string;
  notes: string;
  created_by: string;
  created_at: string;
  tenant_id: string;
}

export type InventoryItemFormData = Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'tenant_id'>; 