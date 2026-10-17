"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Plus, Save, UserPen } from "lucide-react";
import { toast } from "sonner";
import { saveUser, type UserFormState } from "@/actions/users";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_LEVEL, USER_STATUS } from "@/lib/constants";
import type { User } from "@/lib/types";

export function UserDialog({ user }: { user?: User }) {
  const isEdit = Boolean(user);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    start(async () => {
      const result: UserFormState = await saveUser(user?.user_id ?? null, {}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      toast.success(result.ok);
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(undefined);
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label={`แก้ไข ${user?.user_name}`}>
            <UserPen className="size-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" />
            เพิ่มผู้ใช้งาน
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "แก้ไขข้อมูลผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}</DialogTitle>
            <DialogDescription>
              ระดับผู้ใช้งานกำหนดเมนูและขอบเขตข้อมูลที่บัญชีนี้เข้าถึงได้
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="user_name">ชื่อผู้ใช้งาน *</Label>
              <Input
                id="user_name"
                name="user_name"
                defaultValue={user?.user_name}
                maxLength={255}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_email">อีเมล *</Label>
              <Input
                id="user_email"
                name="user_email"
                type="email"
                defaultValue={user?.user_email}
                maxLength={255}
                required
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user_level">ระดับผู้ใช้งาน *</Label>
                <Select name="user_level" defaultValue={user?.user_level ?? "2"}>
                  <SelectTrigger id="user_level" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(USER_LEVEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user_status">สถานะ *</Label>
                <Select name="user_status" defaultValue={user?.user_status ?? "1"}>
                  <SelectTrigger id="user_status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(USER_STATUS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                รหัสผ่าน {isEdit ? "(เว้นว่างไว้ถ้าไม่เปลี่ยน)" : "*"}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                required={!isEdit}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={pending}>
              <Save className="size-4" />
              {pending ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่มผู้ใช้งาน"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
