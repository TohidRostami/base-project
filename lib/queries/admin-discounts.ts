import { prisma } from "@/lib/db";

export type DiscountTargetUser = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
};

export type DiscountCodeRow = {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  maxUses: number | null;
  /** Orders holding one of the global cap's uses (including ones still awaiting payment). */
  usedCount: number;
  /** Customers who have completed a paid purchase with it. */
  redeemedCount: number;
  minOrderTotal: number | null;
  scope: "ALL" | "PRODUCTS";
  productIds: string[];
  targetUser: DiscountTargetUser | null;
  /** ISO timestamps (plain strings, so they pass from server to client components untouched). */
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  /** Whether customers can use it right now: switched off, not started yet, past its end, or live. */
  status: "inactive" | "scheduled" | "expired" | "live";
};

const include = {
  products: { select: { productId: true } },
  targetUser: {
    select: { id: true, name: true, email: true, phoneNumber: true },
  },
  _count: { select: { redemptions: true } },
} as const;

type Found = NonNullable<Awaited<ReturnType<typeof findOne>>>;
const findOne = (id: string) =>
  prisma.discountCode.findUnique({ where: { id }, include });

function statusOf(c: Found, now: number): DiscountCodeRow["status"] {
  if (!c.isActive) return "inactive";
  if (c.startsAt && c.startsAt.getTime() > now) return "scheduled";
  if (c.expiresAt && c.expiresAt.getTime() < now) return "expired";
  return "live";
}

function toRow(c: Found): DiscountCodeRow {
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    redeemedCount: c._count.redemptions,
    minOrderTotal: c.minOrderTotal,
    scope: c.scope,
    productIds: c.products.map((p) => p.productId),
    targetUser: c.targetUser,
    startsAt: c.startsAt?.toISOString() ?? null,
    expiresAt: c.expiresAt?.toISOString() ?? null,
    isActive: c.isActive,
    status: statusOf(c, Date.now()),
  };
}

export async function getAllDiscountCodes(): Promise<DiscountCodeRow[]> {
  const codes = await prisma.discountCode.findMany({
    include,
    orderBy: { createdAt: "desc" },
  });
  return codes.map(toRow);
}

export async function getDiscountCode(
  id: string,
): Promise<DiscountCodeRow | null> {
  const found = await findOne(id);
  return found ? toRow(found) : null;
}

export type DiscountProductOption = {
  id: string;
  name: string;
  category: string;
  archived: boolean;
};

/** Every product an admin may pick for a product-specific code. */
export async function getDiscountProductOptions(): Promise<
  DiscountProductOption[]
> {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      isArchived: true,
      category: { select: { title: true } },
    },
    orderBy: { name: "asc" },
  });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category.title,
    archived: p.isArchived,
  }));
}
