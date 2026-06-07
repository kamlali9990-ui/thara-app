export function printInvoice(order) {
  if (!order) return;

  const items = Array.isArray(order.items) ? order.items : [];
  const itemRows = items.map((item, i) => `
    <tr>
      <td style="text-align:center;padding:6px 8px;border-bottom:1px solid #ddd;">${i + 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;">${item.name}</td>
      <td style="text-align:center;padding:6px 8px;border-bottom:1px solid #ddd;">${item.qty}</td>
      <td style="text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;" dir="ltr">${(item.price || 0).toFixed(2)} ر.س</td>
      <td style="text-align:left;padding:6px 8px;border-bottom:1px solid #ddd;" dir="ltr">${((item.price || 0) * item.qty).toFixed(2)} ر.س</td>
    </tr>
  `).join('');

  const dateStr = order.date ? new Date(order.date).toLocaleString('ar-SA') : '-';
  const statusLabels = {
    'جديد': 'جديد',
    'قيد التحضير': 'قيد التحضير',
    'جاهز للتوصيل': 'جاهز للتوصيل',
    'في الطريق': 'في الطريق',
    'مكتمل': 'مكتمل',
    'ملغي': 'ملغي'
  };

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة طلب #${String(order.id).slice(-6)}</title>
  <style>
    @page { margin: 15mm 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 13px;
      color: #222;
      line-height: 1.6;
      padding: 20px;
    }
    .invoice {
      max-width: 210mm;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #127443;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .header h1 { color: #127443; font-size: 22px; margin-bottom: 4px; }
    .header p { color: #555; font-size: 13px; }
    .invoice-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 6px;
      font-size: 13px;
    }
    .invoice-meta div { flex: 1; }
    .invoice-meta strong { color: #333; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #127443;
      color: #fff;
      padding: 10px 8px;
      font-size: 13px;
      font-weight: 600;
    }
    th:first-child { border-radius: 0 6px 6px 0; }
    th:last-child { border-radius: 6px 0 0 6px; }
    .totals {
      text-align: left;
      margin-top: 10px;
      padding: 12px;
      background: #f9f9f9;
      border-radius: 6px;
    }
    .totals .row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 14px;
    }
    .totals .grand-total {
      font-size: 18px;
      font-weight: bold;
      color: #127443;
      border-top: 2px solid #127443;
      padding-top: 8px;
      margin-top: 8px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #777;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
      .invoice { max-width: 100%; }
    }
    @media print and (max-width: 80mm) {
      .invoice-meta { flex-direction: column; gap: 8px; }
      th, td { font-size: 11px; padding: 4px; }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <h1>أسواق ثراء الشرق ون</h1>
      <p>الخفجي - المملكة العربية السعودية</p>
      <p style="margin-top:4px;font-size:15px;font-weight:bold;">فاتورة طلب</p>
    </div>

    <div class="invoice-meta">
      <div>
        <strong>رقم الفاتورة:</strong> #${String(order.id).slice(-6)}<br>
        <strong>التاريخ:</strong> ${dateStr}
      </div>
      <div>
        <strong>حالة الطلب:</strong> ${statusLabels[order.status] || order.status}<br>
        <strong>طريقة الدفع:</strong> ${order.paymentMethod || '-'}
      </div>
      <div>
        ${order.phone ? `<strong>الجوال:</strong> ${order.phone}<br>` : ''}
        ${order.estimatedDelivery ? `<strong>وقت التوصيل:</strong> خلال ${order.estimatedDelivery} دقيقة` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:40px;">#</th>
          <th>المنتج</th>
          <th style="width:50px;">الكمية</th>
          <th style="width:90px;">السعر</th>
          <th style="width:90px;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="totals">
      <div class="row">
        <span>مجموع المنتجات</span>
        <span dir="ltr">${order.total.toFixed(2)} ر.س</span>
      </div>
      <div class="row">
        <span>التوصيل</span>
        <span dir="ltr">0.00 ر.س</span>
      </div>
      <div class="row grand-total">
        <span>الإجمالي الكلي</span>
        <span dir="ltr">${order.total.toFixed(2)} ر.س</span>
      </div>
    </div>

    ${order.notes ? `<div style="margin-top:15px;padding:10px;background:#fff3cd;border-radius:6px;font-size:13px;"><strong>ملاحظات:</strong> ${order.notes}</div>` : ''}
    ${order.location ? `<div style="margin-top:10px;font-size:12px;color:#555;"><strong>الموقع:</strong> ${order.location}</div>` : ''}

    <div class="footer">
      <p>شكراً لتسوقكم مع أسواق ثراء الشرق ون</p>
      <p style="font-size:11px;">تم إنشاء هذه الفاتورة إلكترونياً - ${new Date().toLocaleString('ar-SA')}</p>
    </div>
  </div>

  <div class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="padding:10px 30px;font-size:16px;background:#127443;color:#fff;border:none;border-radius:6px;cursor:pointer;font-family:inherit;">🖨️ طباعة</button>
    <button onclick="window.close()" style="padding:10px 30px;font-size:16px;background:#666;color:#fff;border:none;border-radius:6px;cursor:pointer;font-family:inherit;margin-right:10px;">إغلاق</button>
  </div>

  <script>
    setTimeout(() => { window.print(); }, 500);
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
