import { prisma } from "@/lib/db";
import { tehranDayEnd, tehranDayStart } from "@/lib/iran-time";
import type { OrdersParams } from "@/lib/admin-orders-params";
import type { Prisma } from "@/lib/generated/prisma";

type UserRow = { id: string; name: string; email: string };

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  source: "ONLINE" | "IN_PERSON";
  total: number;
  subtotal: number;
  shippingCost: number;
  userId: string | null;
  addressId: string | null;
  walkInCustomerName: string | null;
  createdAt: string | Date;
  customer: UserRow | null;
};

export type AdminOrdersResult = {
  orders: AdminOrderRow[];
  totalCount: number;
  totalPages: number;
  /** The page actually shown — a page number past the end is brought back to the last page. */
  page: number;
  perPage: number;
};

/** The days an admin picks are Tehran calendar days, whatever zone the server runs in. */
function createdAtRange(
  from: string | null,
  to: string | null,
): Prisma.OrderWhereInput {
  if (!from && !to) return {};
  return {
    createdAt: {
      ...(from ? { gte: tehranDayStart(from) } : {}),
      ...(to ? { lte: tehranDayEnd(to) } : {}),
    },
  };
}

export async function getAllOrdersForAdmin(
  params: OrdersParams,
): Promise<AdminOrdersResult> {
  const { search, from, to, type, perPage } = params;

  // Built once and reused for both findMany and count, so the total
  // (and therefore totalPages) always matches exactly what's paginated.
  // No `mode: "insensitive"` — that's Postgres-only and breaks on this
  // project's SQLite/Turso database.
  // Search also matches walkInCustomerName, since an in-person order
  // has no linked `user` to search by name through.
  const where: Prisma.OrderWhereInput = {
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search } },
            { user: { name: { contains: search } } },
            { walkInCustomerName: { contains: search } },
          ],
        }
      : {}),
    ...createdAtRange(from, to),
    ...(type === "online"
      ? { source: "ONLINE" }
      : type === "in_person"
        ? { source: "IN_PERSON" }
        : {}),
  };

  const totalCount = await prisma.order.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  // ?page=999 on a short list shows the last page instead of an empty table.
  const page = Math.min(params.page, totalPages);

  const orders = await prisma.order.findMany({
    where,
    include: { user: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * perPage,
    take: perPage,
  });

  return {
    orders: (
      orders as unknown as (AdminOrderRow & { user: UserRow | null })[]
    ).map((o) => ({
      ...o,
      customer: o.user,
    })),
    totalCount,
    totalPages,
    page,
    perPage,
  };
}

/**
 * Orders that count as a sale: paid, and not since cancelled or refunded.
 * Orders still waiting for payment, abandoned ones and refunded ones brought
 * in no money, so adding them up would overstate what the shop sold.
 */
export const SALE_STATUSES = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
] as const;

export type SalesFigures = { count: number; amount: number };

export type SalesReport = {
  total: SalesFigures;
  online: SalesFigures;
  inPerson: SalesFigures;
};

/**
 * Sales for a period, split by how the order was placed. Takes only the
 * period — not the search box or the order-type filter — because the report
 * is itself the online / in-person breakdown, and a "type" filter would
 * blank one half of it. Amounts are what customers paid (after discounts;
 * shipping is پس‌کرایه, paid to the carrier, so it isn't in `total`).
 * The period is measured on the order's date, the same date the table shows.
 */
export async function getSalesReport(
  period: Pick<OrdersParams, "from" | "to">,
): Promise<SalesReport> {
  const grouped = await prisma.order.groupBy({
    by: ["source"],
    where: {
      status: { in: [...SALE_STATUSES] },
      ...createdAtRange(period.from, period.to),
    },
    _count: { _all: true },
    _sum: { total: true },
  });

  const figures = (source: "ONLINE" | "IN_PERSON"): SalesFigures => {
    const row = grouped.find((g) => g.source === source);
    return { count: row?._count._all ?? 0, amount: row?._sum.total ?? 0 };
  };
  const online = figures("ONLINE");
  const inPerson = figures("IN_PERSON");
  return {
    online,
    inPerson,
    total: {
      count: online.count + inPerson.count,
      amount: online.amount + inPerson.amount,
    },
  };
}

export async function getOrderForAdmin(id: string) {
  // One query with the relations included — not "load every user and every
  // address, then search them in memory".
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, email: true, phoneNumber: true },
      },
      address: true,
      discountCode: { select: { code: true } },
      items: true,
    },
  });
  if (!order) return null;

  const { user, address, discountCode, items, ...rest } = order;
  return {
    ...rest,
    customer: user,
    address,
    discountCodeText: discountCode?.code ?? null,
    items,
  };
}
