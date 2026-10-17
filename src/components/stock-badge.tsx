import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STOCK_LEVEL_LABEL, stockLevel } from "@/lib/format";

/**
 * Stock state is shown with an icon and a word as well as a colour, so it is
 * readable without relying on colour alone.
 */
export function StockBadge({ qty, minQty }: { qty: number; minQty: number }) {
  const level = stockLevel(qty, minQty);

  if (level === "out") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="size-3" />
        {STOCK_LEVEL_LABEL.out}
      </Badge>
    );
  }

  if (level === "low") {
    return (
      <Badge className="gap-1 border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100">
        <AlertTriangle className="size-3" />
        {STOCK_LEVEL_LABEL.low}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1">
      <CheckCircle2 className="size-3" />
      {STOCK_LEVEL_LABEL.ok}
    </Badge>
  );
}
