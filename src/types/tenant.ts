export interface Tenant {
  id: string;
  name: string;
  legal_name: string;
  cnpj: string;
  active: boolean;
  contact_email: string;
  contact_phone: string;
  custom_domain?: string;
  max_customers: number;
  plan_type: 'basic' | 'professional' | 'enterprise';
  createdAt: Date;
  logo_url?: string;
  settings: {
    allowMFA: boolean;
    maxAdmins: number;
    maxOperators: number;
    network: {
      ipRanges: string[];
      dns: {
        primary: string;
        secondary: string;
      };
      vlans: number[];
      authType: 'pppoe' | 'ipoe' | 'static';
    };
  };
}