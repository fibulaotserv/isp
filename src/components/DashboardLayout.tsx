import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import ThemeToggle from './ThemeToggle';
import { getTenant } from '../services/tenantService';
import type { Tenant } from '../types/tenant';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Network,
  LogOut,
  Wifi,
  Settings,
  Home,
  DollarSign,
  Building2,
  Package
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const { isDark } = useThemeStore();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    loadTenant();
  }, []);

  const loadTenant = async () => {
    try {
      const data = await getTenant();
      setTenant(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Error loading tenant:', message);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const menuItems = [
    { icon: Home, label: 'Início', path: '/dashboard' },
    { icon: Users, label: 'Clientes', path: '/customers' },
    { icon: Building2, label: 'Empresas', path: '/tenants', show: user?.role === 'master' },
    { icon: Wifi, label: 'Planos', path: '/plans' },
    { icon: DollarSign, label: 'Financeiro', path: '/financial' },
    { icon: Package, label: 'Estoque', path: '/inventory' },
    { icon: UserCog, label: 'Usuários', path: '/users', show: user?.role === 'master' },
    { icon: Network, label: 'Rede FTTH', path: '/network' },
    { icon: Settings, label: 'Configurações', path: '/settings', show: user?.role === 'master' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex relative">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-lg fixed inset-y-0 z-30">
        <div className="h-16 flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt="Logo" className="h-8 w-8 object-contain" />
          ) : (
            <LayoutDashboard className="h-8 w-8 text-indigo-600" />
          )}
          <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">ISP Manager</span>
        </div>
        
        <nav className="mt-4">
          {menuItems.filter(item => !item.show || item.show).map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50'
                  : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="fixed bottom-0 w-64 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">Olá, {user?.name}</span>
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto dark:bg-gray-900 ml-64">
        <div className="py-6 px-8">
          {children}
        </div>
      </div>
    </div>
  );
}