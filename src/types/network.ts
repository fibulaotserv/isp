export interface CTOGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  tenant_id: string;
}

export interface CTO {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  total_ports: number;
  used_ports: number;
  address: string;
  group_id?: string;
  group?: CTOGroup;
}

export interface Port {
  id: string;
  ctoId: string;
  number: number;
  status: 'free' | 'used';
  customerId?: string;
}