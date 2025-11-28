"use client";

import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { MadeWithDyad } from "./made-with-dyad";
import Header from "./Header";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "./ErrorBoundary"; // Importar ErrorBoundary

const Layout = () => {
  console.log("Layout: Componente Layout renderizado.");
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex min-h-screen bg-background text-foreground">
        {/* Sidebar para telas maiores */}
        <div className="hidden md:block">
          <ResizablePanelGroup
            direction="horizontal"
            className="min-h-screen w-full"
          >
            <ResizablePanel defaultSize={18} minSize={15} maxSize={25}>
              <Sidebar />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={82}>
              <main className="flex-1 flex flex-col p-6 lg:p-10">
                <div className="flex-1 max-w-7xl mx-auto w-full">
                  <Header />
                  <ErrorBoundary> {/* ErrorBoundary aqui */}
                    <Outlet />
                  </ErrorBoundary>
                </div>
                <MadeWithDyad />
              </main>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Layout para telas menores (sem ResizablePanel) */}
        <div className="flex flex-col flex-1 md:hidden">
          <Header /> {/* Header com MobileNav para telas pequenas */}
          <main className="flex-1 flex flex-col p-4">
            <div className="flex-1 max-w-7xl mx-auto w-full">
              <ErrorBoundary> {/* ErrorBoundary aqui também para mobile */}
                <Outlet />
              </ErrorBoundary>
            </div>
            <MadeWithDyad />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Layout;