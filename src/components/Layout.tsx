"use client";

import React from "react";
import Sidebar from "./Sidebar";
import { MadeWithDyad } from "./made-with-dyad";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <div className="flex-1 p-6">
          {children}
        </div>
        <MadeWithDyad />
      </main>
    </div>
  );
};

export default Layout;