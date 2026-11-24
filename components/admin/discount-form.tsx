"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { SegmentedControl } from "@/components/admin/segmented-control";
import { ProductMultiSelect } from "@/components/admin/product-multi-select";
import { DiscountUserPicker } from "@/components/admin/discount-user-picker";
import { toTehranIsoDay } from "@/lib/iran-time";
import type {
  DiscountCodeRow,
  DiscountProductOption,
  DiscountTargetUser,
} from "@/lib/queries/admin-discounts";
import {
  createDiscountCode,
  updateDiscountCode,
  type DiscountFormInput,
} from "@/app/admin/discounts/actions";

const numberInput =
  "text-end appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-3 border-t border-border pt-5">
      <legend className="sr-only">{title}</legend>
      <div aria-hidden="true">
        <p className="text-sm font-medium">{title}</p>
        {hint && (
          <p className="mt-1 text-xs leading-6 text-muted-foreground">{hint}</p>
        )}
      </div>
      {children}
    </fieldset>
  );
}

export function DiscountForm({
  discount,
  products,
}: {
  discount?: DiscountCodeRow;
  products: DiscountProductOption[];
}) {
  const router = useRouter();
  const isEdit = !!discount;

  const [code, setCode] = useState(discount?.code ?? "");
  const [type, setType] = useState<"PERCENTAGE" | "FIXED">(
    discount?.type ?? "PERCENTAGE",
  );
  const [value, setValue] = useState(discount?.value?.toString() ?? "");
  const [maxUses, setMaxUses] = useState(discount?.maxUses?.toString() ?? "");
  const [minOrderTotal, setMinOrderTotal] = useState(
    discount?.minOrderTotal?.toString() ?? "",
  );

  // Which products: the whole cart, or only the ones picked.
  const [scope, setScope] = useState<"ALL" | "PRODUCTS">(
    discount?.scope ?? "ALL",
  );
  const [productIds, setProductIds] = useState<string[]>(
    discount?.productIds ?? [],
  );

  // Who: every customer, or exactly one.
  const [audience, setAudience] = useState<"ALL" | "USER">(
    discount?.targetUser ? "USER" : "ALL",
  );
  const [targetUser, setTargetUser] = useState<DiscountTargetUser | null>(
    discount?.targetUser ?? null,
  );

  // When: any time, or only inside a window (either end may be left open).
  const [period, setPeriod] = useState<"ALWAYS" | "RANGE">(
    discount?.startsAt || discount?.expiresAt ? "RANGE" : "ALWAYS",
  );
  const [startsAt, setStartsAt] = useState(
    discount?.startsAt ? toTehranIsoDay(discount.startsAt) : "",
  );
  const [expiresAt, setExpiresAt] = useState(
    discount?.expiresAt ? toTehranIsoDay(discount.expiresAt) : "",
  );

  const [isActive, setIsActive] = useState(discount?.isActive ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function problem(): string | null {
    if (scope === "PRODUCTS" && productIds.length === 0)
      return "حداقل یک محصول را انتخاب کنید یا «همه‌ی محصولات» را بزنید.";
    if (audience === "USER" && !targetUser)
      return "کاربر مورد نظر را انتخاب کنید یا «همه‌ی کاربران» را بزنید.";
    if (period === "RANGE") {
      if (!startsAt && !expiresAt)
        return "حداقل یکی از تاریخ‌های شروع یا پایان را تعیین کنید، یا «همیشه معتبر» را بزنید.";
      if (startsAt && expiresAt && startsAt > expiresAt)
        return "تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.";
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const issue = problem();
    if (issue) {
      setError(issue);
      return;
    }
    setLoading(true);
    setError(null);

    const input: DiscountFormInput = {
      code: code.toUpperCase(),
      type,
      value: Number(value),
      maxUses: maxUses ? Number(maxUses) : null,
      minOrderTotal: minOrderTotal ? Number(minOrderTotal) : null,
      scope,
      productIds: scope === "PRODUCTS" ? productIds : [],
      targetUserId: audience === "USER" ? (targetUser?.id ?? null) : null,
      startsAt: period === "RANGE" ? startsAt || null : null,
      expiresAt: period === "RANGE" ? expiresAt || null : null,
      isActive,
    };

    const result = isEdit
      ? await updateDiscountCode(discount.id, input)
      : await createDiscountCode(input);
    setLoading(false);

    if ("error" in result) {
      setError(result.error ?? "خطایی رخ داد.");
      return;
    }
    toast.success(isEdit ? "کد تخفیف به‌روزرسانی شد" : "کد تخفیف ساخته شد");
    router.push("/admin/discounts");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-2xl flex-col gap-5 rounded-lg border border-border p-6"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">کد تخفیف</Label>
        <Input
          id="code"
          dir="ltr"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="NIKIA10"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="type">نوع تخفیف</Label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as "PERCENTAGE" | "FIXED")}
            className="h-11 rounded-md border border-input bg-background px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="PERCENTAGE">درصدی</option>
            <option value="FIXED">مبلغ ثابت (تومان)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="value">مقدار</Label>
          <Input
            id="value"
            type="number"
            dir="ltr"
            required
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={numberInput}
          />
        </div>
      </div>

      <Section
        title="محصولات مشمول تخفیف"
        hint={
          scope === "PRODUCTS"
            ? type === "PERCENTAGE"
              ? "درصد تخفیف فقط از قیمت محصولات انتخاب‌شده کم می‌شود."
              : "مبلغ ثابت یک‌بار و فقط تا سقف قیمت محصولات انتخاب‌شده از سفارش کم می‌شود."
            : "تخفیف روی کل سبد خرید اعمال می‌شود."
        }
      >
        <SegmentedControl
          label="محصولات مشمول تخفیف"
          value={scope}
          onChange={setScope}
          options={[
            { value: "ALL", label: "همه‌ی محصولات" },
            { value: "PRODUCTS", label: "محصولات مشخص" },
          ]}
        />
        {scope === "PRODUCTS" && (
          <ProductMultiSelect
            options={products}
            value={productIds}
            onChange={setProductIds}
          />
        )}
      </Section>

      <Section
        title="چه کسانی می‌توانند استفاده کنند"
        hint={
          audience === "USER"
            ? "فقط همین کاربر پس از ورود به حساب خود می‌تواند از کد استفاده کند."
            : "هر کاربر وارد‌شده می‌تواند یک‌بار از این کد استفاده کند."
        }
      >
        <SegmentedControl
          label="مخاطب کد تخفیف"
          value={audience}
          onChange={setAudience}
          options={[
            { value: "ALL", label: "همه‌ی کاربران" },
            { value: "USER", label: "یک کاربر مشخص" },
          ]}
        />
        {audience === "USER" && (
          <DiscountUserPicker value={targetUser} onChange={setTargetUser} />
        )}
        <p className="text-xs leading-6 text-muted-foreground">
          در هر دو حالت، هر کاربر فقط یک‌بار می‌تواند از کد استفاده کند؛ کد
          زمانی برای او مصرف می‌شود که خریدش با پرداخت کامل نهایی شود. ثبت سفارش
          بدون پرداخت یا پرداخت ناموفق، کد را مصرف نمی‌کند.
        </p>
      </Section>

      <Section
        title="بازه‌ی اعتبار"
        hint={
          period === "ALWAYS"
            ? "کد بدون محدودیت زمانی و هر زمان که کاربر خواست قابل استفاده است."
            : "کد از ابتدای روز شروع تا پایان روز پایان قابل استفاده است. اگر فقط یکی از دو تاریخ را تعیین کنید، سمت دیگر باز می‌ماند."
        }
      >
        <SegmentedControl
          label="بازه‌ی اعتبار"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "ALWAYS", label: "همیشه معتبر" },
            { value: "RANGE", label: "بازه‌ی زمانی مشخص" },
          ]}
        />
        {period === "RANGE" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>از تاریخ</Label>
              <JalaliDatePicker
                value={startsAt}
                onChange={setStartsAt}
                placeholder="بدون تاریخ شروع"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>تا تاریخ</Label>
              <JalaliDatePicker
                value={expiresAt}
                onChange={setExpiresAt}
                placeholder="بدون تاریخ پایان"
              />
            </div>
          </div>
        )}
      </Section>

      <Section title="محدودیت‌ها (اختیاری)">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="maxUses">
              ظرفیت کل استفاده (برای همه‌ی کاربران)
            </Label>
            <Input
              id="maxUses"
              type="number"
              dir="ltr"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className={numberInput}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="minOrderTotal">حداقل مبلغ سفارش (تومان)</Label>
            <Input
              id="minOrderTotal"
              type="number"
              dir="ltr"
              min={0}
              value={minOrderTotal}
              onChange={(e) => setMinOrderTotal(e.target.value)}
              className={numberInput}
            />
          </div>
        </div>
      </Section>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
        <p className="text-sm">فعال</p>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading
            ? "در حال ذخیره..."
            : isEdit
              ? "ذخیره تغییرات"
              : "ساخت کد تخفیف"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          انصراف
        </Button>
      </div>
    </form>
  );
}
