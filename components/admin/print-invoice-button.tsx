"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Opens the browser's print dialog. The tab title becomes the suggested file
 * name when the person picks "Save as PDF", so it carries the invoice number
 * for the duration of the dialog.
 */
export function PrintInvoiceButton({ orderNumber }: { orderNumber: string }) {
  function handlePrint() {
    const previousTitle = document.title;
    document.title = `فاکتور ${orderNumber}`;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  return (
    <Button type="button" onClick={handlePrint}>
      <Printer />
      چاپ فاکتور
    </Button>
  );
}
