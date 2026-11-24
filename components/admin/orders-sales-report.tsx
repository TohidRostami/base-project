import { Banknote, Globe, Store, type LucideIcon } from "lucide-react";
import { formatToman, toPersianDigits } from "@/lib/format";
import { formatTehranJalali, tehranDayStart } from "@/lib/iran-time";
import type { SalesFigures, SalesReport } from "@/lib/queries/admin-orders";

function periodText(from: string | null, to: string | null): string {
  const day = (iso: string) => formatTehranJalali(tehranDayStart(iso));
  if (!from && !to) return "همه‌ی زمان‌ها";
  if (from && to) return from === to ? day(from) : `از ${day(from)} تا ${day(to)}`;
  return from ? `از ${day(from)}` : `تا ${day(to!)}`;
}

function Tile({
  label,
  icon: Icon,
  figures,
  highlight,
}: {
  label: string;
  icon: LucideIcon;
  figures: SalesFigures;
  highlight?: boolean;
}) {
  return (
    <div className={highlight ? "rounded-lg border border-foreground/30 bg-secondary p-4" : "rounded-lg border border-border p-4"}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.6} />
      </div>
      <p className="mt-3 text-xl font-bold sm:text-2xl">{formatToman(figures.amount)}</p>
      <p className="mt-1 text-sm text-muted-foreground">{toPersianDigits(figures.count)} سفارش</p>
    </div>
  );
}

/**
 * Sales summary for the selected period. The page only renders this for the
 * main admin; the numbers follow the date filter and nothing else.
 */
export function OrdersSalesReport({
  report,
  from,
  to,
}: {
  report: SalesReport;
  from: string | null;
  to: string | null;
}) {
  return (
    <section aria-labelledby="sales-report-title" className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 id="sales-report-title" className="text-base font-bold">
          گزارش فروش
        </h2>
        <p className="text-sm text-muted-foreground">{periodText(from, to)}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Tile label="مجموع فروش" icon={Banknote} figures={report.total} highlight />
        <Tile label="سفارش‌های آنلاین" icon={Globe} figures={report.online} />
        <Tile label="سفارش‌های حضوری" icon={Store} figures={report.inPerson} />
      </div>

      <p className="text-xs leading-6 text-muted-foreground">
        فقط سفارش‌های پرداخت‌شده حساب می‌شوند؛ سفارش‌های در انتظار پرداخت، لغوشده و مرجوعی در گزارش نیستند. مبلغ‌ها پس از
        کسر تخفیف و بدون هزینه‌ی ارسال (پس‌کرایه) است و بر اساس تاریخ ثبت سفارش محاسبه می‌شود. این گزارش فقط از بازه‌ی
        زمانی پیروی می‌کند؛ جستجو و نوع سفارش روی آن اثری ندارند.
      </p>
    </section>
  );
}
