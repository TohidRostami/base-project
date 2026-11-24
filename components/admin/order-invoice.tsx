import { siteConfig, siteUrl } from "@/lib/content";
import {
  buildInvoiceView,
  invoiceDensity,
  type InvoiceField,
  type InvoiceOrder,
} from "@/lib/invoice";

/**
 * The purchase invoice (فاکتور خرید) for one order — an A3 sheet in print.
 *
 * It is styled by its own scoped stylesheet rather than by the app's theme:
 * a printed invoice must look the same whatever the admin's colour scheme is,
 * and the `@page` rule that sets the paper size has to disappear again when
 * the person leaves the page (a `<style>` element is removed with it, a
 * global CSS file is not) — otherwise every other admin page would print as A3.
 */
export function OrderInvoice({ order }: { order: InvoiceOrder }) {
  const view = buildInvoiceView(order);
  const density = invoiceDensity(view.rows.length);
  const { contact, site } = siteConfig;

  return (
    <>
      {/* Static constant — raw text, so React must not entity-escape the quotes in the selectors. */}
      <style dangerouslySetInnerHTML={{ __html: INVOICE_CSS }} />

      <article className="inv" data-density={density} aria-label={`فاکتور خرید ${view.orderNumber}`}>
        <header className="inv-head">
          <div className="inv-seller">
            <div className="inv-brand">
              <span className="inv-logo-fa">{site.name}</span>
              <span className="inv-logo-en" dir="ltr">
                {site.nameLatin}
              </span>
              <span className="inv-tagline">{site.tagline}</span>
            </div>
            <Fields
              className="inv-contact"
              fields={[
                { label: "نشانی", value: contact.address },
                { label: "تلفن", value: contact.phone, ltr: true },
                { label: "ایمیل", value: contact.email, ltr: true },
                { label: "وب‌سایت", value: siteUrl.replace(/^https?:\/\//, ""), ltr: true },
              ]}
            />
          </div>

          <div className="inv-title-block">
            <h2 className="inv-title">فاکتور خرید</h2>
            <Fields fields={view.meta} className="inv-meta" />
          </div>
        </header>

        <section className="inv-parties">
          <div className="inv-box">
            <h3>مشخصات خریدار</h3>
            <Fields fields={view.buyer} />
          </div>
          <div className="inv-box">
            <h3>{view.delivery.title}</h3>
            <Fields fields={view.delivery.fields} />
          </div>
          <div className="inv-box">
            <h3>اطلاعات پرداخت</h3>
            <Fields fields={view.payment} />
          </div>
        </section>

        <section className="inv-items">
          <table>
            <thead>
              <tr>
                <th className="c-index">ردیف</th>
                <th className="c-name">شرح کالا</th>
                <th className="c-size">سایز</th>
                <th className="c-color">رنگ</th>
                <th className="c-qty">تعداد</th>
                <th className="c-money">قیمت واحد (تومان)</th>
                <th className="c-money">مبلغ کل (تومان)</th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => (
                <tr key={row.index}>
                  <td className="c-index">{row.index}</td>
                  <td className="c-name">{row.name}</td>
                  <td className="c-size">{row.size}</td>
                  <td className="c-color">{row.color}</td>
                  <td className="c-qty">{row.quantity}</td>
                  <td className="c-money">{row.unitPrice}</td>
                  <td className="c-money">{row.lineTotal}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="c-sum-label">
                  جمع تعداد کالاها
                </td>
                <td className="c-qty">{view.totalQuantity}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </section>

        {(view.amountInWords || view.delivery.note) && (
          <section className="inv-words">
            {view.amountInWords && (
              <p>
                <span>مبلغ قابل پرداخت به حروف:</span> {view.amountInWords}
              </p>
            )}
            {/* {view.delivery.note && <p className="inv-note">{view.delivery.note}</p>} */}
          </section>
        )}

        <section className="inv-bottom">
          <div className="inv-sign">
            <div>امضا و مهر فروشنده</div>
            <div>امضای خریدار</div>
          </div>

          <table className="inv-totals">
            <tbody>
              <tr>
                <th scope="row">جمع کل کالاها</th>
                <td>{view.totals.subtotal} تومان</td>
              </tr>
              {view.totals.discount && (
                <tr>
                  <th scope="row">{view.totals.discount.label}</th>
                  <td>{view.totals.discount.amount} تومان</td>
                </tr>
              )}
              <tr>
                <th scope="row">هزینه‌ی ارسال</th>
                <td>{view.totals.shipping}</td>
              </tr>
              <tr className="inv-grand">
                <th scope="row">مبلغ قابل پرداخت</th>
                <td>{view.totals.total} تومان</td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer className="inv-foot">
          از خرید شما سپاسگزاریم · {site.name} — {site.tagline}
        </footer>
      </article>
    </>
  );
}

function Fields({ fields, className }: { fields: InvoiceField[]; className?: string }) {
  return (
    <dl className={className ? `inv-fields ${className}` : "inv-fields"}>
      {fields.map((f) => (
        <div key={f.label}>
          <dt>{f.label}</dt>
          <dd>{f.ltr ? <span className="font-nums">{f.value}</span> : f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const INVOICE_CSS = `
.inv {
  --inv-fs: 15px;
  --inv-gap: 22px;
  --inv-row-py: 10px;
  --inv-pad: 32px;
  --inv-ink: #1b1916;
  --inv-muted: #6b6258;
  --inv-line: #cfc6b8;
  --inv-line-strong: #8f8576;
  --inv-tint: #f3eee7;
  display: flex;
  flex-direction: column;
  gap: var(--inv-gap);
  box-sizing: border-box;
  width: 100%;
  max-width: 297mm;
  margin-inline: auto;
  padding: var(--inv-pad);
  background: #fff;
  color: var(--inv-ink);
  border: 1px solid var(--inv-line);
  border-radius: 6px;
  font-size: var(--inv-fs);
  line-height: 1.5;
}
.inv * { box-sizing: border-box; }
.inv h2, .inv h3, .inv p, .inv dl, .inv dd { margin: 0; }

.inv-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 2em; padding-bottom: var(--inv-gap); border-bottom: 2px solid var(--inv-ink); }
.inv-seller { display: flex; flex-direction: column; gap: .7em; min-width: 0; flex: 1; }
.inv-brand { display: flex; align-items: baseline; gap: .8em; line-height: 1.1; }
.inv-logo-fa { font-size: 2.3em; font-weight: 700; letter-spacing: -.01em; }
.inv-logo-en { font-size: .75em; letter-spacing: .45em; color: var(--inv-muted); }
.inv-tagline { color: var(--inv-muted); font-size: .9em; margin-inline-start: .4em; }
.inv-title-block { display: flex; flex-direction: column; gap: .5em; width: 22em; flex: none; }
.inv-title { font-size: 1.9em; font-weight: 700; line-height: 1.2; }

.inv-fields { display: flex; flex-direction: column; gap: .12em; }
.inv-fields > div { display: grid; grid-template-columns: 6.6em 1fr; gap: .5em; align-items: baseline; }
.inv-fields dt { color: var(--inv-muted); font-size: .9em; white-space: nowrap; }
.inv-fields dd { font-weight: 500; overflow-wrap: anywhere; }
.inv-contact { display: grid; grid-template-columns: 1fr 1fr; gap: .12em 2em; }
.inv-contact > div { grid-template-columns: 4em 1fr; }
.inv-meta { display: grid; grid-template-columns: 1fr 1fr; gap: .3em 1.4em; }
.inv-meta > div { display: flex; flex-direction: column; gap: 0; border-bottom: 1px dotted var(--inv-line); padding-bottom: .15em; }

.inv-parties { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--inv-gap); align-items: stretch; }
.inv-box { border: 1px solid var(--inv-line); border-radius: 4px; padding: .6em .9em; display: flex; flex-direction: column; gap: .4em; }
.inv-box h3 { font-size: 1em; font-weight: 700; padding-bottom: .25em; border-bottom: 1px solid var(--inv-line); }
.inv-note { color: var(--inv-muted); font-size: .82em; line-height: 1.5; }

.inv-items { flex: 1 1 auto; }
.inv-items table, .inv-totals { width: 100%; border-collapse: collapse; }
.inv-items table { table-layout: fixed; }
.inv-items th, .inv-items td { border: 1px solid var(--inv-line-strong); padding: var(--inv-row-py) .6em; text-align: right; vertical-align: middle; line-height: 1.4; }
.inv-items thead th { background: var(--inv-tint); font-weight: 700; font-size: .95em; padding-block: .5em; }
.inv-items .c-index { width: 3em; text-align: center; }
.inv-items .c-size { width: 5.5em; text-align: center; }
.inv-items .c-color { width: 8em; text-align: center; }
.inv-items .c-qty { width: 4em; text-align: center; }
.inv-items .c-money { width: 9.5em; text-align: left; font-variant-numeric: tabular-nums; }
.inv-items thead .c-money { text-align: center; }
.inv-items tfoot td { background: var(--inv-tint); font-weight: 700; padding-block: .4em; }
.inv-items tfoot .c-sum-label { text-align: left; }

.inv-words { border: 1px solid var(--inv-line); border-radius: 4px; padding: .4em .9em; display: flex; flex-direction: column; gap: .15em; }
.inv-words span { color: var(--inv-muted); margin-inline-end: .4em; }

.inv-bottom { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 40%); gap: var(--inv-gap); align-items: stretch; }
.inv-sign { display: grid; grid-template-columns: 1fr 1fr; gap: var(--inv-gap); }
.inv-sign > div { border: 1px solid var(--inv-line); border-radius: 4px; padding: .45em .9em; min-height: 6em; color: var(--inv-muted); font-size: .9em; }
.inv-totals th, .inv-totals td { border: 1px solid var(--inv-line-strong); padding: .4em .8em; }
.inv-totals th { text-align: right; font-weight: 500; background: var(--inv-tint); width: 46%; }
.inv-totals td { text-align: left; font-variant-numeric: tabular-nums; font-weight: 600; }
.inv-grand th, .inv-grand td { font-size: 1.15em; font-weight: 700; background: var(--inv-ink); color: #fff; border-color: var(--inv-ink); }

.inv-foot { text-align: center; color: var(--inv-muted); font-size: .85em; padding-top: .6em; border-top: 1px solid var(--inv-line); }

@media screen and (max-width: 900px) {
  .inv { --inv-fs: 14px; --inv-pad: 16px; }
  .inv-head { flex-direction: column; }
  .inv-title-block { width: 100%; }
  .inv-contact { grid-template-columns: 1fr; }
  .inv-parties, .inv-bottom { grid-template-columns: 1fr; }
  .inv-items { overflow-x: auto; }
  .inv-items table { min-width: 640px; }
}

@page { size: A3 portrait; margin: 0; }

@media print {
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  .inv, .inv * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .inv {
    --inv-fs: 12.5pt;
    --inv-gap: 6mm;
    --inv-row-py: 2.2mm;
    --inv-pad: 14mm;
    max-width: none;
    margin: 0;
    border: 0;
    border-radius: 0;
    min-height: 418mm;
  }
  .inv[data-density="normal"] { --inv-fs: 12pt; --inv-row-py: 1.4mm; }
  .inv[data-density="compact"] { --inv-fs: 11pt; --inv-gap: 4.5mm; --inv-row-py: .9mm; --inv-pad: 12mm; }
  .inv[data-density="dense"] { --inv-fs: 10pt; --inv-gap: 3.5mm; --inv-row-py: .5mm; --inv-pad: 10mm; }
  .inv[data-density="tight"] { --inv-fs: 9pt; --inv-gap: 2.5mm; --inv-row-py: .35mm; --inv-pad: 8mm; }
  .inv[data-density="tight"] .inv-sign > div { min-height: 3.5em; }
  .inv tr, .inv-box, .inv-sign > div { break-inside: avoid; }
  .inv thead { display: table-header-group; }
}
`;
