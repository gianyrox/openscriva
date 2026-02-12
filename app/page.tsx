"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import SetupWizard from "@/components/setup/SetupWizard";

export default function Home() {
  const router = useRouter();
  const preferences = useAppStore(function selectPrefs(s) {
    return s.preferences;
  });
  const [ready, setReady] = useState(false);

  useEffect(function checkSetupComplete() {
    if (preferences.keysStored) {
      router.replace("/shelf");
    } else {
      setReady(true);
    }
  }, [preferences.keysStored, router]);

  if (!ready) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--color-bg)",
        }}
      />
    );
  }

  return <SetupWizard />;
}
