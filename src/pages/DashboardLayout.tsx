@@ .. @@
   const menuItems = [
     { icon: Home, label: 'Início', path: '/dashboard' },
     { icon: Users, label: 'Clientes', path: '/customers/new' },
     { icon: Wifi, label: 'Planos', path: '/plans' },
   ]
-    { icon: DollarSign, label: 'Financeiro', path: '/financial' },
+    { icon: DollarSign, label: 'Contas', path: '/financial' },
     { icon: UserCog, label: 'Usuários', path: '/users', show: user?.role === 'master' },
     { icon: Network, label: 'Rede FTTH', path: '/network' },
     { icon: Settings, label: 'Configurações', path: '/settings' },