export type CustomerType = 'individual' | 'business';

export interface Customer {
  id: string;
  type: CustomerType;
  tenant_id: string;
  name: string;
  trade_name?: string;
  state_registration?: string;
  document: string; // CPF or CNPJ
  email: string;
  phone: string;
  birth_date?: string;
  responsible_name?: string;
  responsible_document?: string;
  status: 'active' | 'blocked' | 'cancelled';
  plan_id?: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    latitude?: number;
    longitude?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}