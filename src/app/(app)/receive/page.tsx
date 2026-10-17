import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { StockWorkspace } from "@/components/stock-workspace";
import { requireLevel } from "@/lib/auth";
import { CAN_MOVE_STOCK } from "@/lib/constants";
import { previewDocumentCode } from "@/lib/data";

export const metadata: Metadata = { title: "รับสินค้าเข้าคลัง" };

export default async function ReceivePage() {
  const user = await requireLevel(CAN_MOVE_STOCK);
  const documentCode = await previewDocumentCode("1");

  return (
    <>
      <PageHeader
        title="รับสินค้าเข้าคลัง"
        description="บันทึกการรับสินค้าจากซัพพลายเออร์ด้วยการสแกนบาร์โค้ด"
      />
      <StockWorkspace type="1" user={user} documentCode={documentCode} />
    </>
  );
}
