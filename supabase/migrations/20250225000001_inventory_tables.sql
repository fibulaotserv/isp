/*
  # Create inventory management schema

  1. New Tables
    - `inventory_items`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `sku` (text)
      - `category` (text)
      - `quantity` (integer)
      - `min_quantity` (integer)
      - `cost_price` (numeric)
      - `sale_price` (numeric)
      - `supplier` (text)
      - `location` (text)
      - `last_purchase_date` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `tenant_id` (uuid, foreign key)
    
    - `inventory_categories`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `tenant_id` (uuid, foreign key)
    
    - `inventory_suppliers`
      - `id` (uuid, primary key)
      - `name` (text)
      - `contact_name` (text)
      - `email` (text)
      - `phone` (text)
      - `address` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `tenant_id` (uuid, foreign key)
    
    - `inventory_transactions`
      - `id` (uuid, primary key)
      - `item_id` (uuid, foreign key)
      - `type` (text, check constraint)
      - `quantity` (integer)
      - `reason` (text)
      - `notes` (text)
      - `created_by` (uuid, foreign key)
      - `created_at` (timestamptz)
      - `tenant_id` (uuid, foreign key)

  2. Security
    - Enable RLS on all tables
    - Add policies for tenant-based access control
*/

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sku text NOT NULL,
  category text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 5,
  cost_price numeric(10, 2) NOT NULL DEFAULT 0,
  sale_price numeric(10, 2) NOT NULL DEFAULT 0,
  supplier text,
  location text,
  last_purchase_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create inventory_categories table
CREATE TABLE IF NOT EXISTS inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create inventory_suppliers table
CREATE TABLE IF NOT EXISTS inventory_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('in', 'out')),
  quantity integer NOT NULL,
  reason text NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS inventory_items_tenant_id_idx ON inventory_items(tenant_id);
CREATE INDEX IF NOT EXISTS inventory_items_sku_idx ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS inventory_items_category_idx ON inventory_items(category);
CREATE INDEX IF NOT EXISTS inventory_categories_tenant_id_idx ON inventory_categories(tenant_id);
CREATE INDEX IF NOT EXISTS inventory_suppliers_tenant_id_idx ON inventory_suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS inventory_transactions_item_id_idx ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS inventory_transactions_tenant_id_idx ON inventory_transactions(tenant_id);

-- Enable RLS on all tables
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory_items
CREATE POLICY "Users can view inventory items from their tenant"
  ON inventory_items
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Users can create inventory items in their tenant"
  ON inventory_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Users can update inventory items in their tenant"
  ON inventory_items
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Users can delete inventory items in their tenant"
  ON inventory_items
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Create policies for inventory_categories
CREATE POLICY "Users can view inventory categories from their tenant"
  ON inventory_categories
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Users can create inventory categories in their tenant"
  ON inventory_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Users can update inventory categories in their tenant"
  ON inventory_categories
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Users can delete inventory categories in their tenant"
  ON inventory_categories
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Create policies for inventory_suppliers
CREATE POLICY "Users can view inventory suppliers from their tenant"
  ON inventory_suppliers
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Users can create inventory suppliers in their tenant"
  ON inventory_suppliers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Users can update inventory suppliers in their tenant"
  ON inventory_suppliers
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  )
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Users can delete inventory suppliers in their tenant"
  ON inventory_suppliers
  FOR DELETE
  TO authenticated
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Create policies for inventory_transactions
CREATE POLICY "Users can view inventory transactions from their tenant"
  ON inventory_transactions
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

CREATE POLICY "Users can create inventory transactions in their tenant"
  ON inventory_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

-- Create triggers for updated_at
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_categories_updated_at
  BEFORE UPDATE ON inventory_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_suppliers_updated_at
  BEFORE UPDATE ON inventory_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to update inventory quantity on transaction
CREATE OR REPLACE FUNCTION update_inventory_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'in' THEN
    UPDATE inventory_items
    SET quantity = quantity + NEW.quantity
    WHERE id = NEW.item_id;
  ELSIF NEW.type = 'out' THEN
    UPDATE inventory_items
    SET quantity = GREATEST(0, quantity - NEW.quantity)
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for inventory quantity update
CREATE TRIGGER update_inventory_quantity_on_transaction
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_quantity();

-- Insert default categories
INSERT INTO inventory_categories (name, description, tenant_id)
VALUES 
  ('Equipamentos de Rede', 'Roteadores, switches, access points, etc.', (SELECT id FROM tenants WHERE cnpj = '00000000000000')),
  ('Cabos e Conectores', 'Cabos de rede, fibra óptica, conectores, etc.', (SELECT id FROM tenants WHERE cnpj = '00000000000000')),
  ('Ferramentas', 'Ferramentas para instalação e manutenção', (SELECT id FROM tenants WHERE cnpj = '00000000000000')),
  ('Acessórios', 'Acessórios diversos para instalação', (SELECT id FROM tenants WHERE cnpj = '00000000000000')),
  ('Equipamentos de Proteção', 'Equipamentos de proteção elétrica, etc.', (SELECT id FROM tenants WHERE cnpj = '00000000000000'))
ON CONFLICT DO NOTHING; 