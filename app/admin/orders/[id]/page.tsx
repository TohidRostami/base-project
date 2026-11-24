import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";

import { OrderInvoice } from "@/components/admin/order-invoice";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { PrintInvoiceButton } from "@/components/admin/print-invoice-button";
import { getOrderForAdmin } from "@/lib/queries/admin-orders";

export const metadata: Metadata = { title: "فاکتور سفارش | پنل مدیریت" };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderForAdmin(id);
  if (!order) notFound();

  return (
    <div className="flex flex-col gap-6">
      {/* The toolbar belongs to the screen only — the printed sheet is just the invoice below. */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-col gap-1">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowRight className="size-4" />
            بازگشت به سفارش‌ها
          </Link>
          <h1 className="text-2xl font-bold">
            فاکتور سفارش <span className="font-nums">{order.orderNumber}</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            وضعیت سفارش
            <OrderStatusSelect
              orderId={order.id}
              currentStatus={order.status}
            />
          </label>
          <PrintInvoiceButton orderNumber={order.orderNumber} />
        </div>
      </div>

      <OrderInvoice order={order} />

      <p className="text-xs text-muted-foreground print:hidden">
        فاکتور روی یک برگ A3 (عمودی) چاپ می‌شود. در پنجره‌ی چاپ مرورگر، اندازه‌ی
        کاغذ را A3 و حاشیه‌ها را «هیچ» بگذارید و گزینه‌ی «Background graphics»
        را فعال کنید.
      </p>
    </div>
  );
}
