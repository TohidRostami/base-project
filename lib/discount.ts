import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { formatTehranJalali } from "@/lib/iran-time";
import {
  computeCartDiscount,
  eligibleSubtotal,
  type DiscountKind,
  type DiscountLine,
} from "@/lib/discount-calc";
import { Prisma } from "@/lib/generated/prisma";

/** Works with the shared client and inside a `$transaction` alike. */
type Db = Prisma.TransactionClient;

export type DiscountValidationResult =
  | {
      valid: true;
      id: string;
      code: string;
      type: DiscountKind;
      value: number;
      /** The products the code applies to, or null when it applies to the whole cart. */
      productIds: string[] | null;
      discountAmount: number;
    }
  | { valid: false; error: string };

export type DiscountRow = {
  id: string;
  code: string;
  type: DiscountKind;
  value: number;
  maxUses: number | null;
  usedCount: number;
  minOrderTotal: number | null;
  scope: "ALL" | "PRODUCTS";
  /** Only meaningful when `scope` is "PRODUCTS". */
  productIds: string[];
  /** null = open to every signed-in customer. */
  targetUserId: string | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
};

/** Who is asking, as far as the rules are concerned. */
export type DiscountViewer = {
  /** null for a visitor who is not signed in. */
  userId: string | null;
  /** This customer has already completed a purchase with the code. */
  hasRedeemed: boolean;
};

export const GUEST: DiscountViewer = { userId: null, hasRedeemed: false };

export function normalizeDiscountCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * The rules for a discount code, as a pure function of the row, the cart
 * and who is asking. Used by the cart's live check *and* — inside the
 * checkout transaction — for the authoritative one, so the two can never
 * drift apart.
 *
 * The code is "used up" for a customer only when a purchase with it has been
 * paid (`viewer.hasRedeemed`); merely starting a checkout never counts.
 */
export function evaluateDiscount(
  discount: DiscountRow | null,
  lines: readonly DiscountLine[],
  viewer: DiscountViewer = GUEST,
  now = new Date(),
): DiscountValidationResult {
  if (!discount) return { valid: false, error: "کد تخفیف معتبر نیست." };
  if (!discount.isActive)
    return { valid: false, error: "این کد تخفیف غیرفعال است." };

  if (discount.startsAt && discount.startsAt > now) {
    return {
      valid: false,
      error: `این کد تخفیف از ${formatTehranJalali(discount.startsAt)} فعال می‌شود.`,
    };
  }
  if (discount.expiresAt && discount.expiresAt < now) {
    return { valid: false, error: "این کد تخفیف منقضی شده است." };
  }

  if (discount.targetUserId) {
    if (!viewer.userId) {
      return {
        valid: false,
        error:
          "این کد تخفیف اختصاصی است؛ برای استفاده ابتدا وارد حساب کاربری خود شوید.",
      };
    }
    // Someone else's code reads exactly like a code that doesn't exist.
    if (viewer.userId !== discount.targetUserId)
      return { valid: false, error: "کد تخفیف معتبر نیست." };
  }
  if (viewer.hasRedeemed) {
    return {
      valid: false,
      error: "شما قبلاً از این کد تخفیف استفاده کرده‌اید.",
    };
  }

  if (discount.maxUses != null && discount.usedCount >= discount.maxUses) {
    return {
      valid: false,
      error: "ظرفیت استفاده از این کد تخفیف تمام شده است.",
    };
  }

  const productIds = discount.scope === "PRODUCTS" ? discount.productIds : null;
  if (productIds && eligibleSubtotal(lines, productIds) === 0) {
    return {
      valid: false,
      error:
        "این کد تخفیف فقط برای محصولات مشخصی معتبر است و هیچ‌کدام در سبد شما نیست.",
    };
  }

  const subtotal = eligibleSubtotal(lines, null);
  if (discount.minOrderTotal != null && subtotal < discount.minOrderTotal) {
    return {
      valid: false,
      error: `این کد تخفیف فقط برای سفارش‌های بالای ${formatPrice(discount.minOrderTotal)} تومان معتبر است.`,
    };
  }

  return {
    valid: true,
    id: discount.id,
    code: discount.code,
    type: discount.type,
    value: discount.value,
    productIds,
    discountAmount: computeCartDiscount(
      { type: discount.type, value: discount.value, productIds },
      lines,
    ),
  };
}

/** Loads a code (with its product list) and whether this customer already used it. */
export async function loadDiscount(
  db: Db,
  code: string,
  userId: string | null,
): Promise<{ row: DiscountRow | null; viewer: DiscountViewer }> {
  const found = await db.discountCode.findUnique({
    where: { code },
    include: { products: { select: { productId: true } } },
  });
  if (!found) return { row: null, viewer: { userId, hasRedeemed: false } };

  const redeemed = userId
    ? await db.discountRedemption.findUnique({
        where: { discountCodeId_userId: { discountCodeId: found.id, userId } },
        select: { id: true },
      })
    : null;

  const { products, ...rest } = found;
  return {
    row: { ...rest, productIds: products.map((p) => p.productId) },
    viewer: { userId, hasRedeemed: redeemed != null },
  };
}

/** Loads and evaluates in one go; the row comes back too, for callers that go on to consume the code. */
export async function checkDiscount(
  db: Db,
  rawCode: string,
  lines: readonly DiscountLine[],
  userId: string | null,
  now = new Date(),
): Promise<{ result: DiscountValidationResult; row: DiscountRow | null }> {
  const { row, viewer } = await loadDiscount(
    db,
    normalizeDiscountCode(rawCode),
    userId,
  );
  return { result: evaluateDiscount(row, lines, viewer, now), row };
}

export type DiscountCartItem = { productId: string; quantity: number };

/**
 * The cart's "اعمال" button (and its re-checks): prices the cart from the
 * database — the browser's prices are never trusted — and evaluates the code.
 */
export async function validateDiscountCode(
  code: string,
  items: readonly DiscountCartItem[],
  userId: string | null,
): Promise<DiscountValidationResult> {
  if (!normalizeDiscountCode(code))
    return { valid: false, error: "کد تخفیف را وارد کنید." };

  const products = await prisma.product.findMany({
    where: {
      id: { in: [...new Set(items.map((i) => i.productId))] },
      isPublished: true,
      isArchived: false,
    },
    select: { id: true, price: true },
  });
  const priceById = new Map(products.map((p) => [p.id, p.price]));
  const lines: DiscountLine[] = items.flatMap((i) => {
    const price = priceById.get(i.productId);
    return price == null
      ? []
      : [{ productId: i.productId, price, quantity: i.quantity }];
  });

  return (await checkDiscount(prisma, code, lines, userId)).result;
}

export type RedemptionOutcome =
  /** First use by this customer — now recorded. */
  | "recorded"
  /** This very order was already recorded (a repeated callback). */
  | "already"
  /** The order has no code, no customer, or isn't a paid order. */
  | "none"
  /** The customer had already used the code on another paid order. */
  | "duplicate";

/**
 * Marks a code as used by the customer of a *paid* order. This is the only
 * place a code is consumed for a customer, and it is idempotent, so payment
 * callbacks may call it as often as they like.
 *
 * The (code, customer) pair is unique in the database, so even two payments
 * confirmed at the same instant cannot both record. The second one — a
 * customer who started two checkouts with the same code and paid both — has
 * already paid, so the order stands; it is only reported as "duplicate".
 */
export async function recordDiscountRedemption(
  orderId: string,
): Promise<RedemptionOutcome> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { discountCodeId: true, userId: true, status: true },
  });
  if (!order?.discountCodeId || !order.userId) return "none";
  if (order.status === "PENDING_PAYMENT" || order.status === "CANCELLED")
    return "none";

  try {
    await prisma.discountRedemption.create({
      data: {
        discountCodeId: order.discountCodeId,
        userId: order.userId,
        orderId,
      },
    });
    return "recorded";
  } catch (e) {
    if (
      !(e instanceof Prisma.PrismaClientKnownRequestError) ||
      e.code !== "P2002"
    )
      throw e;
    const own = await prisma.discountRedemption.findUnique({
      where: { orderId },
      select: { id: true },
    });
    if (own) return "already";
    console.warn(
      `[discount] order ${orderId} was paid with a code its customer had already used on another paid order; the order stands.`,
    );
    return "duplicate";
  }
}
