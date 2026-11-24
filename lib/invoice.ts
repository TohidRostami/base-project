import { formatPrice, toPersianDigits } from "@/lib/format";
import { formatTehranJalali, formatTehranJalaliDateTime } from "@/lib/iran-time";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";
import { numberToPersianWords } from "@/lib/persian-words";
import { SHIPPING_COLLECT_LABEL, SHIPPING_COLLECT_NOTE, shippingMethodLabel } from "@/lib/shipping-methods";

/** The part of an order (as `getOrderForAdmin` returns it) the invoice is built from. */
export type InvoiceOrder = {
  orderNumber: string;
  status: string;
  source: string;
  createdAt: Date;
  subtotal: number;
  discountAmount: number;
  discountCodeText: string | null;
  shippingCost: number;
  shippingMethod: string | null;
  total: number;
  paidAt: Date | null;
  paymentRefId: string | null;
  gatewayRef: string | null;
  walkInCustomerName: string | null;
  customer: { name: string; email: string; phoneNumber?: string | null } | null;
  address: {
    fullName: string;
    phone: string;
    landline: string | null;
    province: string;
    city: string;
    addressLine: string;
    postalCode: string;
  } | null;
  items: {
    id: string;
    name: string;
    size: string | null;
    color: string | null;
    quantity: number;
    price: number;
  }[];
};

/** A label/value pair as printed on the sheet; `ltr` marks digits-and-codes that must not be reordered inside RTL text. */
export type InvoiceField = { label: string; value: string; ltr?: boolean };

export type InvoiceView = {
  orderNumber: string;
  isInPerson: boolean;
  typeLabel: string;
  statusLabel: string;
  issuedAt: string;
  meta: InvoiceField[];
  buyer: InvoiceField[];
  delivery: { title: string; fields: InvoiceField[]; note: string | null };
  rows: {
    index: string;
    name: string;
    size: string;
    color: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
  }[];
  totalQuantity: string;
  totals: {
    subtotal: string;
    discount: { label: string; amount: string } | null;
    shipping: string;
    total: string;
  };
  amountInWords: string | null;
  payment: InvoiceField[];
};

const PLACEHOLDER_EMAIL_SUFFIX = "@phone.nikia.local";
const DASH = "—";

const phone = (value: string | null | undefined): string => (value ? toPersianDigits(value) : DASH);

/** Rows that have no value are left out — the sheet never prints an empty label. */
function present(fields: (InvoiceField | null)[]): InvoiceField[] {
  return fields.filter((f): f is InvoiceField => f !== null);
}

function shippingText(order: InvoiceOrder): string {
  if (order.shippingMethod) return SHIPPING_COLLECT_LABEL;
  if (order.shippingCost > 0) return `${formatPrice(order.shippingCost)} تومان`;
  return order.source === "IN_PERSON" ? DASH : "رایگان";
}

export function buildInvoiceView(order: InvoiceOrder): InvoiceView {
  const isInPerson = order.source === "IN_PERSON";
  const typeLabel = isInPerson ? "خرید حضوری" : "خرید آنلاین";
  const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;

  const customerName = order.customer?.name ?? order.walkInCustomerName ?? null;
  const realEmail =
    order.customer && !order.customer.email.endsWith(PLACEHOLDER_EMAIL_SUFFIX) ? order.customer.email : null;
  // The buyer's mobile: the account's number, else the one on the delivery address.
  const mobile = order.customer?.phoneNumber ?? order.address?.phone ?? null;

  const buyer = present([
    { label: "نام خریدار", value: customerName ?? DASH },
    mobile ? { label: "شماره موبایل", value: phone(mobile), ltr: true } : null,
    realEmail ? { label: "ایمیل", value: realEmail, ltr: true } : null,
    !order.customer && isInPerson
      ? { label: "حساب کاربری", value: customerName ? "ندارد (مشتری حضوری)" : "ثبت نشده" }
      : null,
  ]);

  const delivery: InvoiceView["delivery"] = order.address
    ? {
        title: "نشانی تحویل",
        fields: present([
          { label: "گیرنده", value: order.address.fullName },
          { label: "موبایل گیرنده", value: phone(order.address.phone), ltr: true },
          order.address.landline ? { label: "تلفن ثابت", value: phone(order.address.landline), ltr: true } : null,
          { label: "استان / شهر", value: `${order.address.province}، ${order.address.city}` },
          { label: "نشانی", value: order.address.addressLine },
          { label: "کد پستی", value: phone(order.address.postalCode), ltr: true },
          { label: "روش ارسال", value: shippingMethodLabel(order.shippingMethod) ?? DASH },
        ]),
        note: order.shippingMethod ? SHIPPING_COLLECT_NOTE : null,
      }
    : {
        title: "نحوه‌ی تحویل",
        fields: present([
          {
            label: "تحویل",
            value: isInPerson ? "خرید حضوری — کالا در فروشگاه تحویل شده است" : "آدرسی برای این سفارش ثبت نشده است",
          },
        ]),
        note: null,
      };

  const rows = order.items.map((item, i) => ({
    index: toPersianDigits(i + 1),
    name: item.name,
    size: item.size ?? DASH,
    color: item.color ?? DASH,
    quantity: toPersianDigits(item.quantity),
    unitPrice: formatPrice(item.price),
    lineTotal: formatPrice(item.price * item.quantity),
  }));

  const paid = order.paidAt !== null;
  const payment = present([
    { label: "روش پرداخت", value: isInPerson ? "پرداخت حضوری" : "پرداخت آنلاین (درگاه بانکی)" },
    { label: "وضعیت پرداخت", value: paid ? "پرداخت‌شده" : "پرداخت نشده" },
    order.paidAt ? { label: "زمان پرداخت", value: formatTehranJalaliDateTime(order.paidAt) } : null,
    order.paymentRefId ? { label: "کد پیگیری بانک", value: toPersianDigits(order.paymentRefId), ltr: true } : null,
    !isInPerson && order.gatewayRef ? { label: "شناسه‌ی درگاه", value: order.gatewayRef, ltr: true } : null,
  ]);

  const words = numberToPersianWords(order.total);

  return {
    orderNumber: order.orderNumber,
    isInPerson,
    typeLabel,
    statusLabel,
    issuedAt: formatTehranJalaliDateTime(order.createdAt),
    meta: [
      { label: "شماره فاکتور", value: order.orderNumber, ltr: true },
      { label: "تاریخ صدور", value: formatTehranJalali(order.createdAt) },
      { label: "نوع سفارش", value: typeLabel },
      { label: "وضعیت سفارش", value: statusLabel },
    ],
    buyer,
    delivery,
    rows,
    totalQuantity: toPersianDigits(order.items.reduce((sum, item) => sum + item.quantity, 0)),
    totals: {
      subtotal: formatPrice(order.subtotal),
      discount:
        order.discountAmount > 0
          ? {
              label: order.discountCodeText ? `تخفیف (کد ${order.discountCodeText})` : "تخفیف",
              amount: `${formatPrice(order.discountAmount)}`,
            }
          : null,
      shipping: shippingText(order),
      total: formatPrice(order.total),
    },
    amountInWords: words === null ? null : `${words} تومان`,
    payment,
  };
}

export type InvoiceDensity = "roomy" | "normal" | "compact" | "dense" | "tight";

/**
 * How tightly the item rows are set so the whole invoice stays on one A3 sheet.
 * An order holds at most 40 lines (see `createOrder`); the thresholds below
 * were measured against real A3 PDFs (see tests/invoice.test.ts for the ordering rule): a 40-line invoice fits one page in "tight".
 */
export function invoiceDensity(lineCount: number): InvoiceDensity {
  if (lineCount <= 6) return "roomy";
  if (lineCount <= 14) return "normal";
  if (lineCount <= 24) return "compact";
  if (lineCount <= 32) return "dense";
  return "tight";
}
