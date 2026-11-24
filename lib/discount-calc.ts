/**
 * Pure discount maths, safe to import from client components (no database
 * access — that's lib/discount.ts, whose result is the only thing ever
 * trusted for the real charge). The cart and checkout use this purely for
 * a live preview, with exactly the same rules the server applies.
 */

export type DiscountKind = "PERCENTAGE" | "FIXED";

/** A cart line as far as the discount is concerned. */
export type DiscountLine = {
  productId: string;
  price: number;
  quantity: number;
};

/**
 * The part of the cart a code takes money off. `productIds === null` (or
 * undefined) means every product; otherwise only lines of those products.
 */
export function eligibleSubtotal(
  lines: readonly DiscountLine[],
  productIds: readonly string[] | null | undefined,
): number {
  const allowed = productIds ? new Set(productIds) : null;
  let sum = 0;
  for (const line of lines) {
    if (!allowed || allowed.has(line.productId))
      sum += line.price * line.quantity;
  }
  return sum;
}

export function computeDiscountAmount(
  type: DiscountKind,
  value: number,
  subtotal: number,
): number {
  return type === "PERCENTAGE"
    ? Math.round((subtotal * value) / 100)
    : Math.min(value, subtotal);
}

/**
 * Money off a whole cart: a percentage is taken from the eligible lines
 * only, and a fixed amount is taken once, never more than those lines cost.
 */
export function computeCartDiscount(
  discount: {
    type: DiscountKind;
    value: number;
    productIds?: readonly string[] | null;
  },
  lines: readonly DiscountLine[],
): number {
  return computeDiscountAmount(
    discount.type,
    discount.value,
    eligibleSubtotal(lines, discount.productIds),
  );
}
