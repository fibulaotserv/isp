-- Add function to get plan price
CREATE OR REPLACE FUNCTION get_plan_price(p_customer_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_price numeric;
BEGIN
  SELECT p.price INTO v_price
  FROM customers c
  JOIN plans p ON c.plan_id = p.id
  WHERE c.id = p_customer_id;
  
  RETURN COALESCE(v_price, 0);
END;
$$;

-- Update generate_invoice function to use plan price
CREATE OR REPLACE FUNCTION generate_invoice(
  p_customer_id uuid,
  p_due_date date,
  p_payment_type text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
  v_invoice_id uuid;
  v_amount numeric;
BEGIN
  -- Get tenant_id from current user
  v_tenant_id := get_current_tenant_id();
  
  -- Get plan price
  v_amount := get_plan_price(p_customer_id);
  
  IF v_amount = 0 THEN
    RAISE EXCEPTION 'Cliente não possui plano ativo';
  END IF;

  -- Create invoice
  INSERT INTO invoices (
    customer_id,
    tenant_id,
    amount,
    due_date,
    status,
    payment_type,
    total_amount
  )
  VALUES (
    p_customer_id,
    v_tenant_id,
    v_amount,
    p_due_date,
    'pending',
    p_payment_type,
    v_amount
  )
  RETURNING id INTO v_invoice_id;

  -- If payment type is slip, generate payment slip
  IF p_payment_type = 'slip' THEN
    INSERT INTO payment_slips (
      invoice_id,
      tenant_id,
      barcode,
      our_number,
      document_number,
      status
    )
    VALUES (
      v_invoice_id,
      v_tenant_id,
      'DUMMY_BARCODE_' || v_invoice_id,
      'DUMMY_NUMBER_' || v_invoice_id,
      'DOC_' || v_invoice_id,
      'pending'
    );
  END IF;

  -- Create financial transaction
  INSERT INTO transactions (
    type,
    description,
    amount,
    date,
    due_date,
    status,
    category,
    customer_id,
    tenant_id
  )
  VALUES (
    'income',
    'Fatura - ' || to_char(p_due_date, 'MM/YYYY'),
    v_amount,
    CURRENT_DATE,
    p_due_date,
    'pending',
    'mensalidade',
    p_customer_id,
    v_tenant_id
  );

  RETURN v_invoice_id;
END;
$$;