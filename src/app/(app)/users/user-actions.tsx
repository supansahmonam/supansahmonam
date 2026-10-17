"use client";

import { useTransition } from "react";
import { KeyRound, MoreHorizontal, ShieldBan, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { resetPassword, setUserStatus } from "@/actions/users";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/lib/types";

export function UserActions({ user, isSelf }: { user: User; isSelf: boolean }) {
  const [pending, start] = useTransition();
  const suspended = user.user_status === "0";

  function toggleStatus() {
    start(async () => {
      const result = await setUserStatus(user.user_id, suspended ? "1" : "0");
      if (result.error) toast.error(result.error);
      else toast.success(result.ok);
    });
  }

  function sendReset() {
    start(async () => {
      const result = await resetPassword(user.user_email);
      if (result.error) toast.error(result.error);
      else toast.success(result.ok);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={pending}
          aria-label={`จัดการบัญชี ${user.user_name}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={sendReset}>
          <KeyRound className="size-4" />
          รีเซ็ตรหัสผ่าน
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={toggleStatus}
          disabled={isSelf}
          variant={suspended ? "default" : "destructive"}
        >
          {suspended ? (
            <>
              <ShieldCheck className="size-4" />
              เปิดใช้งานบัญชี
            </>
          ) : (
            <>
              <ShieldBan className="size-4" />
              ระงับการใช้งาน
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
