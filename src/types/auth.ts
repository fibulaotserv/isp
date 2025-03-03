export interface User {
  id: string;
  email: string;
  name: string;
  role: 'master' | 'admin' | 'operator';
  tenant_id: string;
  mfaEnabled: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}