"use client";

import { useEffect, useRef } from "react";
import { applyDiscountCode } from "@/app/(shop)/cart/actions";
import { useCartStore } from "@/lib/store/cart";

/**
 * Keeps an applied discount code honest. It was valid when it was typed in,
 * but the cart changes (products added or removed, quantities) and so can the
 * code — it may have expired, or belong to products that left the cart, or the
 * customer may have signed in and turn out to have used it already. Each time
 * the cart's contents change the server re-checks it: a code that no longer
 * holds is removed (with `onInvalid` told why), and one that still holds gets
 * its details refreshed.
 *
 * Only product ids and quantities are sent; prices are read from the database.
 */
export function useDiscountSync(onInvalid: (message: string) => void) {
  const code = useCartStore((s) => s.discountCode?.code);
  const key = useCartStore((s) =>
    s.items
      .map((i) => `${i.productId}:${i.quantity}`)
      .sort()
      .join("|"),
  );

  const notify = useRef(onInvalid);
  useEffect(() => {
    notify.current = onInvalid;
  });

  useEffect(() => {
    if (!code || !key) return;
    let alive = true;
    const items = useCartStore
      .getState()
      .items.map((i) => ({ productId: i.productId, quantity: i.quantity }));

    applyDiscountCode(code, items)
      .then((r) => {
        if (!alive) return;
        const { setDiscountCode } = useCartStore.getState();
        if (!r.valid) {
          setDiscountCode(null);
          notify.current(r.error);
        } else {
          setDiscountCode({ id: r.id, code: r.code, type: r.type, value: r.value, productIds: r.productIds });
        }
      })
      .catch(() => {
        // Offline or a server hiccup: keep what the customer has; checkout checks again anyway.
      });
    return () => {
      alive = false;
    };
  }, [code, key]);
}
