interface InvoiceOrderItem {
  qty: number;
  name: string;
  price?: number;
  currentPrice?: number;
  unit?: string;
}

interface InvoiceOrder {
  id: number | string;
  customerEmail?: string;
  assignedDriverId?: string | number;
  acceptedBy?: { id: string | number };
  date?: string;
  status?: string;
  phone?: string;
  paymentMethod?: string;
  notes?: string;
  items?: InvoiceOrderItem[];
  total?: number;
  deliveryFee?: number;
  location?: string;
  estimatedDelivery?: number;
}

interface InvoiceCtx {
  currentStaff?: { name?: string; email?: string };
  drivers?: { id: string | number; name?: string; email?: string }[];
  customers?: { id?: string | number; email?: string; name?: string }[];
  staffList?: { id: string | number; name?: string; email?: string }[];
}

function lookupCustomer(email: string | undefined, customers: InvoiceCtx['customers']) {
  if (!email || !customers) return null;
  return customers.find(c => c.email?.toLowerCase() === email.toLowerCase()) || null;
}

function lookupDriver(driverId: string | number | undefined, drivers: InvoiceCtx['drivers']) {
  if (!driverId || !drivers) return null;
  return drivers.find(d => String(d.id) === String(driverId)) || null;
}

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('ar-SA', {
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return '-'; }
}

const STORE_NAME = 'أسواق ثراء الشرق ون';
const STORE_SUB = 'الخفجي - المملكة العربية السعودية';
const STORE_PHONE = '00966503203994';

function statusLabel(s: string | undefined) {
  const labels: Record<string, string> = {
    'جديد': 'جديد', 'قيد التحضير': 'قيد التحضير',
    'جاهز للتوصيل': 'جاهز للتوصيل', 'في الطريق': 'في الطريق',
    'مكتمل': 'مكتمل', 'ملغي': 'ملغي'
  };
  return labels[s || ''] || s;
}

function calcFee(order: InvoiceOrder) {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsTotal = items.reduce((sum, item) => {
    const price = item.currentPrice ?? item.price ?? 0;
    return sum + (Number(price) * Number(item.qty || 1));
  }, 0);
  const total = Number(order.total) || 0;
  if (order.deliveryFee !== undefined && order.deliveryFee !== null) {
    return { itemsTotal: Math.round(itemsTotal * 100) / 100, deliveryFee: Number(order.deliveryFee), grandTotal: total };
  }
  const fee = Math.max(0, total - itemsTotal);
  return { itemsTotal: Math.round(itemsTotal * 100) / 100, deliveryFee: Math.round(fee * 100) / 100, grandTotal: total };
}

function lookupAcceptedBy(order: InvoiceOrder, staffList: InvoiceCtx['staffList']) {
  const ab = order.acceptedBy;
  if (!ab || !staffList) return null;
  return staffList.find(s => String(s.id) === String(ab.id)) || null;
}

function generateCashierHtml(order: InvoiceOrder, ctx: InvoiceCtx) {
  const { currentStaff, drivers, customers, staffList } = ctx || {};
  const customer = lookupCustomer(order.customerEmail, customers);
  const driver = lookupDriver(order.assignedDriverId, drivers);
  const acceptedByStaff = lookupAcceptedBy(order, staffList);
  const items = Array.isArray(order.items) ? order.items : [];
  const invoiceNum = String(order.id).slice(-6);
  const customerId = customer?.id ? String(customer.id).padStart(5, '0') : '—';
  const dateStr = formatDate(order.date);

  const itemRows = items.map((item) => `
    <tr>
      <td style="text-align:center;padding:3px 2px;font-size:11px;border-bottom:1px dashed #444;">${item.qty}</td>
      <td style="padding:3px 2px;font-size:11px;border-bottom:1px dashed #444;">${item.name}</td>
      <td style="text-align:right;padding:3px 2px;font-size:11px;border-bottom:1px dashed #444;direction:ltr;" dir="ltr">${(item.price || 0).toFixed(2)}</td>
      <td style="text-align:right;padding:3px 2px;font-size:11px;border-bottom:1px dashed #444;direction:ltr;" dir="ltr">${((item.price || 0) * item.qty).toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=80mm">
  <title>فاتورة #${invoiceNum}</title>
  <style>
    @page { margin: 0; size: 80mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', 'Segoe UI', Tahoma, monospace;
      font-size: 12px;
      color: #111;
      padding: 8px 6px;
      width: 72mm;
      margin: 0 auto;
    }
    .header { text-align: center; padding-bottom: 6px; border-bottom: 2px solid #111; margin-bottom: 6px; }
    .header h1 { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
    .header p { font-size: 10px; color: #333; }
    .header .sub { font-size: 14px; font-weight: bold; margin-top: 4px; }
    .meta { font-size: 10px; padding: 4px 0; border-bottom: 1px dashed #444; margin-bottom: 4px; }
    .meta .row { display: flex; justify-content: space-between; padding: 1px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
    th {
      background: #111; color: #fff; padding: 4px 2px;
      font-size: 10px; font-weight: bold;
    }
    th:nth-child(1) { width: 30px; }
    th:nth-child(3) { width: 40px; }
    th:nth-child(4) { width: 45px; }
    .totals { font-size: 11px; padding: 4px 0; border-top: 2px solid #111; }
    .totals .row { display: flex; justify-content: space-between; padding: 2px 0; }
    .totals .grand { font-size: 14px; font-weight: bold; border-top: 2px solid #111; padding-top: 4px; margin-top: 4px; }
    .staff-info { font-size: 10px; padding: 4px 0; border-top: 1px dashed #444; margin-top: 4px; }
    .barcode { text-align: center; padding: 8px 0 4px; }
    .barcode svg { max-width: 100%; height: auto; }
    .footer { text-align: center; font-size: 10px; color: #555; padding-top: 6px; border-top: 1px dashed #444; margin-top: 6px; }
    .no-print { text-align: center; margin-top: 12px; }
    .no-print button {
      padding: 10px 20px; font-size: 14px; background: #127443;
      color: #fff; border: none; border-radius: 6px; cursor: pointer;
      font-family: inherit; margin: 4px;
    }
    .no-print .close-btn { background: #666; }
    @media print { .no-print { display: none; } body { padding: 4px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${STORE_NAME}</h1>
    <p>${STORE_SUB}</p>
    <div class="sub">فاتورة بيع</div>
  </div>

  <div class="meta">
    <div class="row"><span>رقم الفاتورة</span><span dir="ltr">#${invoiceNum}</span></div>
    <div class="row"><span>رقم حساب العميل</span><span dir="ltr">#${customerId}</span></div>
    <div class="row"><span>التاريخ</span><span>${dateStr}</span></div>
    <div class="row"><span>الحالة</span><span>${statusLabel(order.status)}</span></div>
    ${order.phone ? `<div class="row"><span>الجوال</span><span dir="ltr">${order.phone}</span></div>` : ''}
    <div class="row"><span>الدفع</span><span>${order.paymentMethod || '-'}</span></div>
  </div>

  <table>
    <thead>
      <tr><th>ع</th><th>الصنف</th><th>السعر</th><th>المجموع</th></tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>مجموع الأصناف</span><span dir="ltr">${calcFee(order).itemsTotal.toFixed(2)} ر.س</span></div>
    <div class="row"><span>رسوم التوصيل</span><span dir="ltr">${calcFee(order).deliveryFee.toFixed(2)} ر.س</span></div>
    <div class="row grand"><span>الإجمالي</span><span dir="ltr">${calcFee(order).grandTotal.toFixed(2)} ر.س</span></div>
  </div>

  ${order.notes ? `<div style="font-size:10px;padding:4px;background:#eee;margin-top:4px;"><strong>ملاحظات:</strong> ${order.notes}</div>` : ''}

  <div class="staff-info">
    ${order.acceptedBy ? `<div style="display:flex;justify-content:space-between;"><span>مستلم الطلب:</span><span>${acceptedByStaff?.name || acceptedByStaff?.email || '—'}</span></div>` : ''}
    ${currentStaff ? `<div style="display:flex;justify-content:space-between;"><span>موظف الفاتورة:</span><span>${currentStaff.name || currentStaff.email || '—'}</span></div>` : ''}
    ${driver ? `<div style="display:flex;justify-content:space-between;"><span>كابتن التوصيل:</span><span>${driver.name || driver.email || '—'}</span></div>` : ''}
  </div>

  <div class="barcode">
    <svg id="barcode"></svg>
  </div>

  <div class="footer">
    <p>شكراً لتسوقكم مع ${STORE_NAME}</p>
    <p style="font-size:9px;">هاتف: ${STORE_PHONE}</p>
  </div>

  <div class="no-print">
    <button onclick="window.print()">🖨️ طباعة</button>
    <button class="close-btn" onclick="window.close()">إغلاق</button>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <script>
    try {
      JsBarcode('#barcode', '${invoiceNum}', {
        format: 'CODE128', width: 1.5, height: 36,
        displayValue: true, fontSize: 11, margin: 0,
        background: 'transparent', lineColor: '#111'
      });
    } catch(e) { console.error('JsBarcode error', e); document.getElementById('barcode').outerHTML = '<div style="font-size:14px;letter-spacing:4px;font-weight:bold;">${invoiceNum}</div>'; }
    setTimeout(function() { window.print(); }, 600);
  </script>
</body>
</html>`;
}

function generateA4Html(order: InvoiceOrder, ctx: InvoiceCtx) {
  const { currentStaff, drivers, customers, staffList } = ctx || {};
  const customer = lookupCustomer(order.customerEmail, customers);
  const driver = lookupDriver(order.assignedDriverId, drivers);
  const acceptedByStaff = lookupAcceptedBy(order, staffList);
  const items = Array.isArray(order.items) ? order.items : [];
  const invoiceNum = String(order.id).slice(-6);
  const customerId = customer?.id ? String(customer.id).padStart(5, '0') : '—';
  const dateStr = formatDate(order.date);

  const itemRows = items.map((item, i) => `
    <tr>
      <td style="text-align:center;padding:8px 10px;border-bottom:1px solid #ddd;">${i + 1}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #ddd;">${item.name}${item.unit ? ` (${item.unit})` : ''}</td>
      <td style="text-align:center;padding:8px 10px;border-bottom:1px solid #ddd;">${item.qty}</td>
      <td style="text-align:right;padding:8px 10px;border-bottom:1px solid #ddd;direction:ltr;" dir="ltr">${(item.price || 0).toFixed(2)}</td>
      <td style="text-align:right;padding:8px 10px;border-bottom:1px solid #ddd;direction:ltr;" dir="ltr">${((item.price || 0) * item.qty).toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة ضريبية #${invoiceNum}</title>
  <style>
    @page { margin: 15mm 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 13px; color: #222; line-height: 1.6; padding: 20px;
    }
    .invoice { max-width: 210mm; margin: 0 auto; }
    .header {
      text-align: center; border-bottom: 3px solid #127443;
      padding-bottom: 15px; margin-bottom: 20px;
    }
    .header h1 { color: #127443; font-size: 24px; margin-bottom: 4px; }
    .header p { color: #555; font-size: 14px; }
    .header .sub { font-size: 16px; font-weight: bold; color: #333; margin-top: 6px; }
    .invoice-meta {
      display: flex; justify-content: space-between; flex-wrap: wrap;
      margin-bottom: 20px; padding: 14px; background: #f5f5f5;
      border-radius: 8px; font-size: 13px; gap: 10px;
    }
    .invoice-meta .col { flex: 1; min-width: 150px; }
    .invoice-meta strong { color: #127443; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th {
      background: #127443; color: #fff; padding: 10px 12px;
      font-size: 13px; font-weight: 600;
    }
    th:first-child { border-radius: 0 6px 6px 0; width: 40px; }
    th:nth-child(3) { width: 60px; }
    th:nth-child(4) { width: 100px; }
    th:nth-child(5) { width: 100px; }
    th:last-child { border-radius: 6px 0 0 6px; }
    .totals {
      text-align: left; margin-top: 10px; padding: 14px;
      background: #f9f9f9; border-radius: 8px;
    }
    .totals .row {
      display: flex; justify-content: space-between;
      padding: 5px 0; font-size: 14px;
    }
    .totals .grand-total {
      font-size: 20px; font-weight: bold; color: #127443;
      border-top: 2px solid #127443; padding-top: 10px; margin-top: 10px;
    }
    .staff-box {
      display: flex; justify-content: space-between; flex-wrap: wrap;
      margin-top: 20px; padding: 14px; background: #f0fdf4;
      border: 1px solid #bbf7d0; border-radius: 8px; font-size: 13px; gap: 10px;
    }
    .staff-box .col { flex: 1; min-width: 120px; }
    .staff-box strong { color: #127443; }
    .barcode { text-align: center; margin: 20px 0; }
    .barcode svg { max-width: 300px; height: auto; }
    .footer {
      text-align: center; margin-top: 30px; padding-top: 15px;
      border-top: 1px solid #ddd; font-size: 12px; color: #777;
    }
    .notes-box {
      margin-top: 15px; padding: 12px; background: #fff3cd;
      border-radius: 8px; font-size: 13px;
    }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <h1>${STORE_NAME}</h1>
      <p>${STORE_SUB}</p>
      <div class="sub">فاتورة ضريبية</div>
    </div>

    <div class="invoice-meta">
      <div class="col">
        <strong>رقم الفاتورة:</strong> #${invoiceNum}<br>
        <strong>رقم حساب العميل:</strong> #${customerId}<br>
        <strong>التاريخ:</strong> ${dateStr}
      </div>
      <div class="col">
        <strong>حالة الطلب:</strong> ${statusLabel(order.status)}<br>
        <strong>طريقة الدفع:</strong> ${order.paymentMethod || '-'}<br>
        ${order.estimatedDelivery ? `<strong>وقت التوصيل:</strong> خلال ${order.estimatedDelivery} دقيقة` : ''}
      </div>
      <div class="col">
        ${customer ? `<strong>العميل:</strong> ${customer.name || '—'}<br>` : ''}
        ${order.phone ? `<strong>الجوال:</strong> ${order.phone}` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr><th>#</th><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>مجموع المنتجات</span><span dir="ltr">${calcFee(order).itemsTotal.toFixed(2)} ر.س</span></div>
      <div class="row"><span>رسوم التوصيل</span><span dir="ltr">${calcFee(order).deliveryFee.toFixed(2)} ر.س</span></div>
      <div class="row grand-total"><span>الإجمالي الكلي</span><span dir="ltr">${calcFee(order).grandTotal.toFixed(2)} ر.س</span></div>
    </div>

    ${order.notes ? `<div class="notes-box"><strong>ملاحظات:</strong> ${order.notes}</div>` : ''}

    ${order.location ? `<div style="margin-top:10px;font-size:12px;color:#555;"><strong>موقع التوصيل:</strong> ${order.location}</div>` : ''}

    <div class="staff-box">
      <div class="col">
        <strong>مستلم الطلب:</strong> ${order.acceptedBy ? (acceptedByStaff?.name || acceptedByStaff?.email || '—') : '—'}
      </div>
      <div class="col">
        <strong>موظف الفاتورة:</strong> ${currentStaff ? (currentStaff.name || currentStaff.email || '—') : '—'}
      </div>
      <div class="col">
        <strong>كابتن التوصيل:</strong> ${driver ? (driver.name || driver.email || '—') : 'غير معين'}
      </div>
    </div>

    <div class="barcode">
      <svg id="barcode"></svg>
    </div>

    <div class="footer">
      <p>شكراً لتسوقكم مع ${STORE_NAME}</p>
      <p style="font-size:11px;">هاتف: ${STORE_PHONE} | ${STORE_SUB}</p>
      <p style="font-size:10px;margin-top:4px;">تم إنشاء هذه الفاتورة إلكترونياً - ${new Date().toLocaleString('ar-SA')}</p>
    </div>
  </div>

  <div class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="padding:12px 36px;font-size:16px;background:#127443;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;">🖨️ طباعة</button>
    <button onclick="window.close()" style="padding:12px 36px;font-size:16px;background:#666;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;margin-right:10px;">إغلاق</button>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <script>
    try {
      JsBarcode('#barcode', '${invoiceNum}', {
        format: 'CODE128', width: 2, height: 50,
        displayValue: true, fontSize: 14, margin: 5,
        background: 'transparent', lineColor: '#127443'
      });
    } catch(e) { console.error('JsBarcode error', e); document.getElementById('barcode').outerHTML = '<div style="font-size:18px;letter-spacing:6px;font-weight:bold;color:#127443;">${invoiceNum}</div>'; }
    setTimeout(function() { window.print(); }, 600);
  </script>
</body>
</html>`;
}

export function printInvoice(order: InvoiceOrder, ctx: InvoiceCtx): void {
  if (!order) return;

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>اختيار نموذج الطباعة</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: linear-gradient(135deg, #06190e 0%, #0d3d24 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      direction: rtl;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .logo { max-width: 120px; margin-bottom: 1.5rem; border-radius: 16px; }
    h1 { color: #fff; font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #94a3b8; font-size: 0.95rem; margin-bottom: 2rem; }
    .options {
      display: flex;
      gap: 1.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .card {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 2rem 2.5rem;
      cursor: pointer;
      transition: all 0.25s ease;
      width: 260px;
      -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
    }
    .card:hover {
      background: rgba(255,255,255,0.12);
      border-color: #127443;
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(18,116,67,0.3);
    }
    .card .icon { font-size: 3rem; margin-bottom: 1rem; }
    .card h2 { color: #fff; font-size: 1.2rem; margin-bottom: 0.5rem; }
    .card p { color: #94a3b8; font-size: 0.85rem; margin-bottom: 0; }
    .card .badge {
      display: inline-block;
      background: rgba(251,191,36,0.15);
      color: #fbbf24;
      font-size: 0.75rem;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      margin-top: 0.75rem;
    }
    .close-btn {
      margin-top: 2rem;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      color: #94a3b8;
      padding: 0.75rem 2rem;
      border-radius: 12px;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .close-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
  </style>
</head>
<body>
  <div class="container">
    <img src="${import.meta.env.BASE_URL || '/'}logo222.jpg" alt="" class="logo" onerror="this.style.display='none'">
    <h1>اختيار نموذج الفاتورة</h1>
    <p>طلب رقم #${String(order.id).slice(-6)}</p>
    <div class="options">
      <div class="card" onclick="window.opener.__printFormat('cashier')">
        <div class="icon">🧾</div>
        <h2>فاتورة كاشير</h2>
        <p>مقاس 80مم - مناسب لطابعات الكاشير الحرارية</p>
        <div class="badge">🖨️ طباعة حرارية</div>
      </div>
      <div class="card" onclick="window.opener.__printFormat('a4')">
        <div class="icon">📄</div>
        <h2>فاتورة A4</h2>
        <p>مقاس المكتبي - مناسب لطابعات A4 العادية</p>
        <div class="badge">📋 فاتورة ضريبية</div>
      </div>
    </div>
    <button class="close-btn" onclick="window.close()">إلغاء</button>
  </div>
  <script>
    document.querySelectorAll('.card').forEach(el => {
      el.addEventListener('click', function() {
        document.querySelectorAll('.card').forEach(c => c.style.opacity = '0.5');
        this.style.opacity = '1';
      });
    });
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=550,height=650,scrollbars=no');
  if (!win) return;

  win.document.write(html);
  win.document.close();

  (window as any).__printFormat = function(format: string) {
    win.close();
    const invoiceHtml = format === 'cashier'
      ? generateCashierHtml(order, ctx)
      : generateA4Html(order, ctx);
    const printWin = window.open('', '_blank', 'width=' + (format === 'cashier' ? '550' : '900') + ',height=700,scrollbars=yes');
    if (printWin) {
      printWin.document.write(invoiceHtml);
      printWin.document.close();
    }
  };
}
