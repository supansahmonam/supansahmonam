import type { Metadata } from "next";
import { UserActions } from "./user-actions";
import { UserDialog } from "./user-dialog";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireLevel } from "@/lib/auth";
import { CAN_ADMIN, USER_LEVEL, USER_STATUS } from "@/lib/constants";
import { listUsers } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "จัดการผู้ใช้งาน" };

const LEVEL_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  "0": "default",
  "1": "secondary",
  "2": "outline",
  "3": "outline",
};

export default async function UsersPage() {
  const me = await requireLevel(CAN_ADMIN);
  const users = await listUsers();

  return (
    <>
      <PageHeader
        title="จัดการผู้ใช้งานและสิทธิ์การใช้งาน"
        description="กำหนดสิทธิ์การเข้าถึงข้อมูลตามระดับผู้ใช้งาน"
        action={<UserDialog />}
      />

      <Card className="overflow-hidden py-0">
        {/* phones: one card per account */}
        <ul className="divide-y md:hidden">
          {users.map((user) => {
            const isSelf = user.user_id === me.user_id;
            return (
              <li key={user.user_id} className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium leading-snug">
                    {user.user_name}
                    {isSelf ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (บัญชีของคุณ)
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{user.user_email}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge variant={LEVEL_VARIANT[user.user_level]}>
                      {USER_LEVEL[user.user_level]}
                    </Badge>
                    <span
                      className={`text-xs ${
                        user.user_status === "1" ? "text-emerald-700" : "text-destructive"
                      }`}
                    >
                      {USER_STATUS[user.user_status]}
                    </span>
                  </div>
                </div>
                <div className="-mr-2 flex shrink-0">
                  <UserDialog user={user} />
                  <UserActions user={user} isSelf={isSelf} />
                </div>
              </li>
            );
          })}
        </ul>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อผู้ใช้งาน</TableHead>
                <TableHead>อีเมล</TableHead>
                <TableHead>ระดับผู้ใช้งาน</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="hidden lg:table-cell">วันเวลาที่สร้างบัญชี</TableHead>
                <TableHead className="w-24 text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isSelf = user.user_id === me.user_id;
                return (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <span className="font-medium">{user.user_name}</span>
                      {isSelf ? (
                        <span className="ml-2 text-xs text-muted-foreground">(บัญชีของคุณ)</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.user_email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={LEVEL_VARIANT[user.user_level]}>
                        {USER_LEVEL[user.user_level]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.user_status === "1" ? (
                        <span className="text-sm text-emerald-700">
                          {USER_STATUS["1"]}
                        </span>
                      ) : (
                        <span className="text-sm text-destructive">
                          {USER_STATUS[user.user_status]}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {formatDateTime(user.user_createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <UserDialog user={user} />
                        <UserActions user={user} isSelf={isSelf} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </>
  );
}
