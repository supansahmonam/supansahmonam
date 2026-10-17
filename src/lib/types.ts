import type {
  TransactionNotify,
  TransactionStatus,
  TransactionType,
  UserLevel,
  UserStatus,
} from "@/lib/constants";

/** Table 3.1 */
export type User = {
  user_id: string;
  user_name: string;
  user_email: string;
  user_status: UserStatus;
  user_level: UserLevel;
  user_createdAt: string;
  user_updatedAt: string;
};

/** Table 3.2 */
export type Product = {
  product_id: string;
  product_barcode: string;
  product_name: string;
  product_category: string;
  product_unit: string;
  product_price: number;
  product_qty: number;
  product_minQty: number;
  product_image: string | null;
  product_createdAt: string;
  product_updatedAt: string;
};

/** Table 3.3 */
export type Transaction = {
  transaction_id: string;
  transaction_code: string;
  transaction_type: TransactionType;
  transaction_qty: number;
  transaction_price: number;
  transaction_date: string;
  transaction_note: string | null;
  transaction_status: TransactionStatus;
  transaction_notify: TransactionNotify;
  product_id: string;
  user_id: string;
  transaction_createdAt: string;
  transaction_updatedAt: string;
};

/** A transaction row joined with the product and user it refers to. */
export type TransactionDetail = Transaction & {
  products: Pick<Product, "product_name" | "product_barcode" | "product_unit"> | null;
  users: Pick<User, "user_name"> | null;
};

export type AppSettings = {
  id: number;
  line_enabled: boolean;
  line_recipient_scope: "broadcast" | "admins";
  daily_summary_enabled: boolean;
  daily_summary_time: string;
  message_template: string;
  updated_at: string;
};

/** Return shape of the move_stock() RPC. */
export type MoveStockResult = {
  transaction_id: string;
  transaction_code: string;
  product_name: string;
  product_unit: string;
  qty_before: number;
  qty_after: number;
  min_qty: number;
  below_min: boolean;
};

export type DashboardSummary = {
  total_products: number;
  stock_value: number;
  below_min: number;
  today_moves: number;
};

export type MovementPoint = {
  day: string;
  received: number;
  issued: number;
};

export type CategoryBreakdown = {
  category: string;
  items: number;
  qty: number;
  value: number;
};

/** One line waiting to be confirmed on the receive / issue screens. */
export type CartLine = {
  key: string;
  product: Product;
  qty: number;
  note: string;
};
