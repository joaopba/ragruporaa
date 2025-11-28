"use client";

import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { MadeWithDyad } from "./made-with-dyad";
import Header from "./Header";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "./ErrorBoundary";
import DailyActivityBanner from "./DailyActivityBanner";
import RealtimeNotifier from "./RealtimeNotifier"; // Importando o novo componente

const Layout = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background text-foreground md:grid md:grid-cols-[250px_1fr] lg:grid-cols-[280px_1fr]">
        {/* Sidebar for desktop */}
        <div className="hidden md:block border-r bg-sidebar">
          <Sidebar />
        </div>

        {/* Main content area */}
        <div className="flex flex-col w-full min-w-0">
          <Header />
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto bg-secondary/40">
            <div className="mx-auto w-full max-w-7xl">
              <RealtimeNotifier /> {/* Adicionando o notificador aqui */}
              <DailyActivityBanner />
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
              <MadeWithDyad />
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Layout;