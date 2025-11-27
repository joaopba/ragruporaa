"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-primary-foreground" />
      <span className="sr-only">Carregando...</span>
    </div>
  );
};

export default LoadingSpinner;