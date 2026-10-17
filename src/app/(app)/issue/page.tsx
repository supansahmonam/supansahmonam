import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { StockWorkspace } from "@/components/stock-workspace";
import { requireLevel } from "@/lib/auth";
import { CAN_MOVE_STOCK } from "@/lib/constants";
import { previewDocumentCode } from "@/lib/data";

export const metadata: Metadata = { title: "จ่ายสินค้าออกจากคลัง" };

export default async function IssuePage() {
  const user = await requireLevel(CAN_MOVE_STOCK);
  const documentCode = await previewDocumentCode("2");

  return (
    <>
      <PageHeader
        title="จ่ายสินค้าออกจากคลัง"
        description="ระบบตรวจยอดคงเหลือก่อนอนุมัติ และแจ้งเตือนผ่าน LINE เมื่อสินค้าต่ำกว่าจุดสั่งซื้อขั้นต่ำ"
      />
      <StockWorkspace type="2" user={user} documentCode={documentCode} />
    </>
  );
}
