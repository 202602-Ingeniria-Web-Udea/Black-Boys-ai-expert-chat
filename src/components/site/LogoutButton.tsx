"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/client/api";

export function LogoutButton({ variant = "ghost", label = "Cerrar sesión", className }: { variant?: "ghost" | "secondary"; label?: string; className?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (err) {
      toast(errorMessage(err), "error");
      setLoading(false);
    }
  }

  return (
    <Button variant={variant} size="sm" onClick={logout} loading={loading} className={className}>
      {loading ? null : <LogOut className="size-4" aria-hidden="true" />}
      {label}
    </Button>
  );
}
