"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { isIsoDay, tehranDayEnd, tehranDayStart } from "@/lib/iran-time";
import { toLatinDigits } from "@/lib/format";
import { Prisma } from "@/lib/generated/prisma";
import type { DiscountTargetUser } from "@/lib/queries/admin-discounts";

export type DiscountFormInput = {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  maxUses: number | null;
  minOrderTotal: number | null;
  /** "ALL": the whole cart. "PRODUCTS": only `productIds`. */
  scope: "ALL" | "PRODUCTS";
  productIds: string[];
  /** null: every customer. Otherwise only this user may use the code. */
  targetUserId: string | null;
  /** Gregorian "YYYY-MM-DD" days (what the Jalali picker produces), read as Tehran calendar days. null = no limit on that side. */
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
};

async function validate(input: DiscountFormInput): Promise<string | null> {
  if (!/^[A-Z0-9]+$/.test(input.code))
    return "کد فقط می‌تواند شامل حروف بزرگ انگلیسی و عدد باشد.";
  if (!Number.isInteger(input.value) || input.value <= 0)
    return "مقدار تخفیف باید یک عدد صحیح بزرگ‌تر از صفر باشد.";
  if (input.type === "PERCENTAGE" && input.value > 100)
    return "درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.";
  if (
    input.maxUses != null &&
    (!Number.isInteger(input.maxUses) || input.maxUses < 1)
  ) {
    return "حداکثر تعداد استفاده باید حداقل ۱ باشد.";
  }
  if (
    input.minOrderTotal != null &&
    (!Number.isInteger(input.minOrderTotal) || input.minOrderTotal < 0)
  ) {
    return "حداقل مبلغ سفارش معتبر نیست.";
  }

  if (input.scope !== "ALL" && input.scope !== "PRODUCTS")
    return "محدوده‌ی محصولات نامعتبر است.";
  if (input.scope === "PRODUCTS") {
    if (!Array.isArray(input.productIds) || input.productIds.length === 0) {
      return "حداقل یک محصول را برای این کد انتخاب کنید.";
    }
    const found = await prisma.product.count({
      where: { id: { in: input.productIds } },
    });
    if (found !== new Set(input.productIds).size)
      return "یکی از محصولات انتخاب‌شده پیدا نشد.";
  }

  if (input.targetUserId) {
    const user = await prisma.user.findUnique({
      where: { id: input.targetUserId },
      select: { id: true },
    });
    if (!user) return "کاربر انتخاب‌شده پیدا نشد.";
  }

  for (const day of [input.startsAt, input.expiresAt]) {
    if (day != null && !isIsoDay(day)) return "تاریخ نامعتبر است.";
  }
  if (input.startsAt && input.expiresAt && input.startsAt > input.expiresAt) {
    return "تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.";
  }
  return null;
}

/** The columns every create/update writes — everything except the product list. */
function toData(input: DiscountFormInput) {
  return {
    code: input.code,
    type: input.type,
    value: input.value,
    maxUses: input.maxUses,
    minOrderTotal: input.minOrderTotal,
    scope: input.scope,
    targetUserId: input.targetUserId,
    // A day-granular window, in Tehran time: valid from the first moment of the start day
    // until the last moment of the end day.
    startsAt: input.startsAt ? tehranDayStart(input.startsAt) : null,
    expiresAt: input.expiresAt ? tehranDayEnd(input.expiresAt) : null,
    isActive: input.isActive,
  };
}

function productRows(input: DiscountFormInput) {
  return input.scope === "PRODUCTS"
    ? [...new Set(input.productIds)].map((productId) => ({ productId }))
    : [];
}

function isDuplicateCode(e: unknown) {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
  );
}

export async function createDiscountCode(input: DiscountFormInput) {
  await requireAdmin();
  const error = await validate(input);
  if (error) return { error };

  try {
    await prisma.discountCode.create({
      data: {
        ...toData(input),
        usedCount: 0,
        products: { create: productRows(input) },
      },
    });
  } catch (e) {
    if (isDuplicateCode(e))
      return { error: "این کد تخفیف قبلاً ساخته شده است." };
    throw e;
  }
  revalidatePath("/admin/discounts");
  return { success: true as const };
}

export async function updateDiscountCode(id: string, input: DiscountFormInput) {
  await requireAdmin();
  const error = await validate(input);
  if (error) return { error };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.discountCode.update({ where: { id }, data: toData(input) });
      // The product list is replaced as a whole.
      await tx.discountCodeProduct.deleteMany({
        where: { discountCodeId: id },
      });
      const rows = productRows(input);
      if (rows.length > 0) {
        await tx.discountCodeProduct.createMany({
          data: rows.map((r) => ({ ...r, discountCodeId: id })),
        });
      }
    });
  } catch (e) {
    if (isDuplicateCode(e))
      return { error: "این کد تخفیف قبلاً ساخته شده است." };
    throw e;
  }
  revalidatePath("/admin/discounts");
  return { success: true as const };
}

export async function deleteDiscountCode(id: string) {
  await requireAdmin();
  await prisma.discountCode.delete({ where: { id } });
  revalidatePath("/admin/discounts");
  return { success: true as const };
}

/** The user picker's search: by name, email or mobile number. */
export async function searchDiscountUsers(
  query: string,
): Promise<DiscountTargetUser[]> {
  await requireAdmin();
  if (typeof query !== "string") return [];
  const q = toLatinDigits(query).trim().slice(0, 60);
  if (q.length < 2) return [];

  // Phone numbers are stored in international form (+98912…), so also try the number without its leading 0.
  const digits = q.replace(/\D/g, "");
  const phone = digits.length >= 4 ? digits.replace(/^0+/, "") : null;

  return prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { email: { contains: q } },
        ...(phone ? [{ phoneNumber: { contains: phone } }] : []),
      ],
    },
    select: { id: true, name: true, email: true, phoneNumber: true },
    orderBy: { name: "asc" },
    take: 8,
  });
}
