"use client";

import Link from "next/link";
import { Settings, LogOut } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { logout } from "@/features/auth/actions";
import type { SessionUser } from "@/lib/auth/dal";

/**
 * Profilmenu i topbaren. Viser brugerens billede/navn og en lille menu med
 * "Indstillinger" og "Log ud". Log ud kalder server-action'en `logout`.
 */
export function ProfileMenu({ user }: { user: SessionUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Profilmenu"
        className="ml-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar
          src={user.avatarUrl}
          alt={user.name}
          fallback={getInitials(user.name)}
          className="size-8"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLabel>
          <div className="leading-tight">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/indstillinger">
            <Settings />
            Indstillinger
          </Link>
        </DropdownMenuItem>

        <form action={logout}>
          <DropdownMenuItem
            asChild
            className="text-destructive focus:text-destructive"
          >
            <button type="submit" className="w-full">
              <LogOut />
              Log ud
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
