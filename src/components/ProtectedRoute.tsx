"use client";

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSession } from './SessionContextProvider';

const ProtectedRoute = () => {
  const { session } = useSession();
  const location = useLocation();

  if (!session) {
    // Redireciona para a página de login, mas salva a localização atual
    // para que o usuário possa ser redirecionado de volta após o login.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;