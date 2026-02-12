"use client";

import { useState, useCallback, type ReactNode } from "react";
import ShellLayout from "@/components/shell/ShellLayout";
import LeftSidebar from "@/components/sidebar/LeftSidebar";
import StatusBar from "@/components/shell/StatusBar";
import RightPanel from "@/components/rightpanel/RightPanel";
import KeyboardShortcuts from "@/components/shell/KeyboardShortcuts";

export default function BookLayout({ children }: { children: ReactNode }) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const handleToggleShortcuts = useCallback(function handleToggleShortcuts() {
    setShortcutsOpen(function toggle(prev) {
      return !prev;
    });
  }, []);

  const handleCloseShortcuts = useCallback(function handleCloseShortcuts() {
    setShortcutsOpen(false);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <ShellLayout
        leftContent={<LeftSidebar />}
        rightContent={<RightPanel />}
        onToggleShortcuts={handleToggleShortcuts}
      >
        {children}
      </ShellLayout>
      <div className="shell-status-bar">
        <StatusBar />
      </div>
      <KeyboardShortcuts open={shortcutsOpen} onClose={handleCloseShortcuts} />
    </div>
  );
}
