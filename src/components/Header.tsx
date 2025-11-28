"use client";

import React from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Scan, Package, History } from 'lucide-react';
import { MobileNav } from './MobileNav'; // Importar MobileNav
import { ThemeToggle } from './ThemeToggle'; // Importar ThemeToggle

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case '/':
      return { title: 'Dashboard', icon: LayoutDashboard };
    case '/opme-scanner':
      return { title: 'Bipagem de OPME', icon: Scan };
    case '/opme-registration':
      return { title: 'Cadastro de OPME', icon: Package };
    case '/linked-opme-view':
      return { title: 'Visualizar Bipagens', icon: History };
    default:
      return { title: 'Página', icon: LayoutDashboard };
  }
};

const Header = () => {
  const location = useLocation();
  const { title, icon: Icon } = getPageTitle(location.pathname);

  return (
    <header className="flex items-center justify-between p-4 md:p-6 bg-card border-b border-border shadow-sm rounded-lg mb-8">
      <div className="flex items-center gap-4">
        <MobileNav /> {/* Adicionar o MobileNav aqui */}
        <Icon className="h-7 w-7 md:h-8 md:w-8 text-primary" />
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle /> {/* Adicionar o ThemeToggle aqui */}
        {/* Futuramente: Adicionar elementos como perfil do usuário, notificações, etc. */}
      </div>
    </header>
  );
};

export default Header;