"use client";

import { useSession, signOut, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "./theme-toggle";

interface KnownUser {
  email: string;
  name: string;
  picture: string;
}

export function Header() {
  const { data: session } = useSession();
  const [knownUsers, setKnownUsers] = useState<KnownUser[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/users")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setKnownUsers(data.users ?? []))
      .catch(() => setKnownUsers([]));
  }, []);

  const switchUser = async (email: string) => {
    if (email === session?.user?.email) return;
    setSwitching(email);
    try {
      const result = await signIn("switch", { email, redirect: false });
      if (result?.error) {
        toast.error("No se pudo cambiar de cuenta: sesión expirada o sin permisos");
      } else {
        toast.success("Cuenta cambiada");
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.error("Switch user failed:", error);
      toast.error("Error al cambiar de cuenta");
    } finally {
      setSwitching(null);
    }
  };

  const handleSignOut = () => signOut({ callbackUrl: "/auth/login" });

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
      <div className="flex h-full items-center justify-between px-4 lg:px-6 ml-64 transition-all duration-200">
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                  <AvatarFallback>{session?.user?.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1">
                Cambiar de cuenta
              </DropdownMenuLabel>
              {knownUsers.length === 0 && (
                <DropdownMenuItem className="text-muted-foreground text-sm">
                  <Users className="mr-2 h-4 w-4" />
                  Solo esta cuenta
                </DropdownMenuItem>
              )}
              {knownUsers.map((user) => (
                <DropdownMenuItem
                  key={user.email}
                  onClick={() => switchUser(user.email)}
                  disabled={switching === user.email}
                  className={switching === user.email ? "opacity-50" : ""}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.picture || ""} alt={user.name || user.email} />
                      <AvatarFallback>{user.name?.[0] || user.email[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm">{user.name || user.email}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                    {switching === user.email && <Loader2 className="ml-auto h-3 w-3 animate-spin" />}
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
