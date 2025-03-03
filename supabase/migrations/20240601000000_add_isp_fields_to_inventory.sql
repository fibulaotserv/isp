-- Adiciona campos específicos para provedores de internet à tabela inventory_items
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS item_type TEXT CHECK (item_type IN ('onu', 'router', 'cable', 'connector', 'other')),
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS model TEXT,
ADD COLUMN IF NOT EXISTS mac_address TEXT,
ADD COLUMN IF NOT EXISTS serial_number TEXT,
ADD COLUMN IF NOT EXISTS cable_length NUMERIC,
ADD COLUMN IF NOT EXISTS cable_type TEXT,
ADD COLUMN IF NOT EXISTS connector_type TEXT CHECK (connector_type IN ('UPC', 'APC'));

-- Cria índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_inventory_items_item_type ON inventory_items (item_type);
CREATE INDEX IF NOT EXISTS idx_inventory_items_brand ON inventory_items (brand);
CREATE INDEX IF NOT EXISTS idx_inventory_items_mac_address ON inventory_items (mac_address);
CREATE INDEX IF NOT EXISTS idx_inventory_items_serial_number ON inventory_items (serial_number); 