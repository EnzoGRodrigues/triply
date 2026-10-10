"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage, logout } from "@/lib/api-client";
import { hardNavigate } from "@/lib/navigation";
import { cn } from "@/lib/cn";
import { Button } from "./ui/Button";

interface LogoutButtonProps {
  /** Só o ícone (celular). */
  iconOnly?: boolean;
  className?: string;
}

export function LogoutButton({ iconOnly, className }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await logout();
      hardNavigate("/login");
    } catch (error) {
      toast.error(getErrorMessage(error));
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      loading={loading}
      onClick={handleLogout}
      aria-label="Sair da conta"
      icon={<LogOut className="size-[18px]" aria-hidden />}
      className={cn(iconOnly && "size-10 px-0", className)}
    >
      {iconOnly ? null : "Sair"}
    </Button>
  );
}
