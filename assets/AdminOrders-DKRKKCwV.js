const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/leaflet-CIGW-MKW.css"])))=>i.map(i=>d[i]);
import{_ as $e,k as t,d as ze,r as y}from"./index-AWRYGbIY.js";import{d as g}from"./vendor-BYNofETs.js";import{L as P}from"./leaflet-DbWlNhU7.js";import"./supabase-C8W5_S3P.js";P.Icon.Default.imagePath="https://unpkg.com/leaflet@1.9.4/dist/images/";function Ce({lat:n,lng:a,height:r=150}){const s=g.useRef(null),p=g.useRef(null);return g.useEffect(()=>{if(!s.current||n==null||a==null)return;$e(()=>Promise.resolve({}),__vite__mapDeps([0]));const m=P.map(s.current,{center:[n,a],zoom:16,zoomControl:!0,dragging:!0,scrollWheelZoom:!1,attributionControl:!0});P.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(m),P.marker([n,a]).addTo(m),p.current=m;let o=null;return typeof ResizeObserver<"u"&&(o=new ResizeObserver(()=>m.invalidateSize()),o.observe(s.current)),()=>{o&&o.disconnect(),m.remove(),p.current=null}},[n,a]),t.jsx("div",{ref:s,className:"order-location-map",style:{height:r},"aria-label":"موقع العميل على الخريطة"})}function K(n){if(!n)return null;const a=String(n).match(/Lat:\s*([\d.]+).*Lng:\s*([\d.]+)/i);if(!a)return null;const r=parseFloat(a[1]),s=parseFloat(a[2]);return Number.isNaN(r)||Number.isNaN(s)?null:{lat:r,lng:s}}function se(n){const{lat:a,lng:r}=n;return{googleDir:`https://www.google.com/maps/dir/?api=1&destination=${a},${r}`,osmView:`https://www.openstreetmap.org/?mlat=${a}&mlon=${r}#map=17/${a}/${r}`,osmDir:`https://www.openstreetmap.org/directions?to=${a}%2C${r}`}}function ae(n,a){return!n||!a?null:a.find(r=>{var s;return((s=r.email)==null?void 0:s.toLowerCase())===n.toLowerCase()})||null}function oe(n,a){return!n||!a?null:a.find(r=>String(r.id)===String(n))||null}function le(n){if(!n)return"-";try{return new Date(n).toLocaleString("ar-SA",{year:"numeric",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}catch{return"-"}}const V="أسواق ثراء الشرق ون",Q="الخفجي - المملكة العربية السعودية",de="00966503203994";function ce(n){return{جديد:"جديد","قيد التحضير":"قيد التحضير","جاهز للتوصيل":"جاهز للتوصيل","في الطريق":"في الطريق",مكتمل:"مكتمل",ملغي:"ملغي"}[n]||n}function C(n){const r=(Array.isArray(n.items)?n.items:[]).reduce((m,o)=>{const f=o.currentPrice??o.price??0;return m+Number(f)*Number(o.qty||1)},0),s=Number(n.total)||0;if(n.deliveryFee!==void 0&&n.deliveryFee!==null)return{itemsTotal:Math.round(r*100)/100,deliveryFee:Number(n.deliveryFee),grandTotal:s};const p=Math.max(0,s-r);return{itemsTotal:Math.round(r*100)/100,deliveryFee:Math.round(p*100)/100,grandTotal:s}}function pe(n,a){const r=n.acceptedBy;return!r||!a?null:a.find(s=>String(s.id)===String(r.id))||null}function Se(n,a){const{currentStaff:r,drivers:s,customers:p,staffList:m}=a||{},o=ae(n.customerEmail,p),f=oe(n.assignedDriverId,s),h=pe(n,m),S=Array.isArray(n.items)?n.items:[],u=String(n.id).slice(-6),$=o!=null&&o.id?String(o.id).padStart(5,"0"):"—",T=le(n.date),I=S.map((x,F)=>`
    <tr>
      <td style="text-align:center;padding:3px 2px;font-size:11px;border-bottom:1px dashed #444;">${x.qty}</td>
      <td style="padding:3px 2px;font-size:11px;border-bottom:1px dashed #444;">${x.name}</td>
      <td style="text-align:right;padding:3px 2px;font-size:11px;border-bottom:1px dashed #444;direction:ltr;" dir="ltr">${(x.price||0).toFixed(2)}</td>
      <td style="text-align:right;padding:3px 2px;font-size:11px;border-bottom:1px dashed #444;direction:ltr;" dir="ltr">${((x.price||0)*x.qty).toFixed(2)}</td>
    </tr>
  `).join("");return`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=80mm">
  <title>فاتورة #${u}</title>
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
    <h1>${V}</h1>
    <p>${Q}</p>
    <div class="sub">فاتورة بيع</div>
  </div>

  <div class="meta">
    <div class="row"><span>رقم الفاتورة</span><span dir="ltr">#${u}</span></div>
    <div class="row"><span>رقم حساب العميل</span><span dir="ltr">#${$}</span></div>
    <div class="row"><span>التاريخ</span><span>${T}</span></div>
    <div class="row"><span>الحالة</span><span>${ce(n.status)}</span></div>
    ${n.phone?`<div class="row"><span>الجوال</span><span dir="ltr">${n.phone}</span></div>`:""}
    <div class="row"><span>الدفع</span><span>${n.paymentMethod||"-"}</span></div>
  </div>

  <table>
    <thead>
      <tr><th>ع</th><th>الصنف</th><th>السعر</th><th>المجموع</th></tr>
    </thead>
    <tbody>
      ${I}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>مجموع الأصناف</span><span dir="ltr">${C(n).itemsTotal.toFixed(2)} ر.س</span></div>
    <div class="row"><span>رسوم التوصيل</span><span dir="ltr">${C(n).deliveryFee.toFixed(2)} ر.س</span></div>
    <div class="row grand"><span>الإجمالي</span><span dir="ltr">${C(n).grandTotal.toFixed(2)} ر.س</span></div>
  </div>

  ${n.notes?`<div style="font-size:10px;padding:4px;background:#eee;margin-top:4px;"><strong>ملاحظات:</strong> ${n.notes}</div>`:""}

  <div class="staff-info">
    ${n.acceptedBy?`<div style="display:flex;justify-content:space-between;"><span>مستلم الطلب:</span><span>${(h==null?void 0:h.name)||(h==null?void 0:h.email)||"—"}</span></div>`:""}
    ${r?`<div style="display:flex;justify-content:space-between;"><span>موظف الفاتورة:</span><span>${r.name||r.email||"—"}</span></div>`:""}
    ${f?`<div style="display:flex;justify-content:space-between;"><span>كابتن التوصيل:</span><span>${f.name||f.email||"—"}</span></div>`:""}
  </div>

  <div class="barcode">
    <svg id="barcode"></svg>
  </div>

  <div class="footer">
    <p>شكراً لتسوقكم مع ${V}</p>
    <p style="font-size:9px;">هاتف: ${de}</p>
  </div>

  <div class="no-print">
    <button onclick="window.print()">🖨️ طباعة</button>
    <button class="close-btn" onclick="window.close()">إغلاق</button>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <script>
    try {
      JsBarcode('#barcode', '${u}', {
        format: 'CODE128', width: 1.5, height: 36,
        displayValue: true, fontSize: 11, margin: 0,
        background: 'transparent', lineColor: '#111'
      });
    } catch(e) { console.error('JsBarcode error', e); document.getElementById('barcode').outerHTML = '<div style="font-size:14px;letter-spacing:4px;font-weight:bold;">${u}</div>'; }
    setTimeout(function() { window.print(); }, 600);
  <\/script>
</body>
</html>`}function Te(n,a){const{currentStaff:r,drivers:s,customers:p,staffList:m}=a||{},o=ae(n.customerEmail,p),f=oe(n.assignedDriverId,s),h=pe(n,m),S=Array.isArray(n.items)?n.items:[],u=String(n.id).slice(-6),$=o!=null&&o.id?String(o.id).padStart(5,"0"):"—",T=le(n.date),I=S.map((x,F)=>`
    <tr>
      <td style="text-align:center;padding:8px 10px;border-bottom:1px solid #ddd;">${F+1}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #ddd;">${x.name}${x.unit?` (${x.unit})`:""}</td>
      <td style="text-align:center;padding:8px 10px;border-bottom:1px solid #ddd;">${x.qty}</td>
      <td style="text-align:right;padding:8px 10px;border-bottom:1px solid #ddd;direction:ltr;" dir="ltr">${(x.price||0).toFixed(2)}</td>
      <td style="text-align:right;padding:8px 10px;border-bottom:1px solid #ddd;direction:ltr;" dir="ltr">${((x.price||0)*x.qty).toFixed(2)}</td>
    </tr>
  `).join("");return`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>فاتورة ضريبية #${u}</title>
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
      <h1>${V}</h1>
      <p>${Q}</p>
      <div class="sub">فاتورة ضريبية</div>
    </div>

    <div class="invoice-meta">
      <div class="col">
        <strong>رقم الفاتورة:</strong> #${u}<br>
        <strong>رقم حساب العميل:</strong> #${$}<br>
        <strong>التاريخ:</strong> ${T}
      </div>
      <div class="col">
        <strong>حالة الطلب:</strong> ${ce(n.status)}<br>
        <strong>طريقة الدفع:</strong> ${n.paymentMethod||"-"}<br>
        ${n.estimatedDelivery?`<strong>وقت التوصيل:</strong> خلال ${n.estimatedDelivery} دقيقة`:""}
      </div>
      <div class="col">
        ${o?`<strong>العميل:</strong> ${o.name||"—"}<br>`:""}
        ${n.phone?`<strong>الجوال:</strong> ${n.phone}`:""}
      </div>
    </div>

    <table>
      <thead>
        <tr><th>#</th><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
      </thead>
      <tbody>
        ${I}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>مجموع المنتجات</span><span dir="ltr">${C(n).itemsTotal.toFixed(2)} ر.س</span></div>
      <div class="row"><span>رسوم التوصيل</span><span dir="ltr">${C(n).deliveryFee.toFixed(2)} ر.س</span></div>
      <div class="row grand-total"><span>الإجمالي الكلي</span><span dir="ltr">${C(n).grandTotal.toFixed(2)} ر.س</span></div>
    </div>

    ${n.notes?`<div class="notes-box"><strong>ملاحظات:</strong> ${n.notes}</div>`:""}

    ${n.location?`<div style="margin-top:10px;font-size:12px;color:#555;"><strong>موقع التوصيل:</strong> ${n.location}</div>`:""}

    <div class="staff-box">
      <div class="col">
        <strong>مستلم الطلب:</strong> ${n.acceptedBy&&((h==null?void 0:h.name)||(h==null?void 0:h.email))||"—"}
      </div>
      <div class="col">
        <strong>موظف الفاتورة:</strong> ${r&&(r.name||r.email)||"—"}
      </div>
      <div class="col">
        <strong>كابتن التوصيل:</strong> ${f?f.name||f.email||"—":"غير معين"}
      </div>
    </div>

    <div class="barcode">
      <svg id="barcode"></svg>
    </div>

    <div class="footer">
      <p>شكراً لتسوقكم مع ${V}</p>
      <p style="font-size:11px;">هاتف: ${de} | ${Q}</p>
      <p style="font-size:10px;margin-top:4px;">تم إنشاء هذه الفاتورة إلكترونياً - ${new Date().toLocaleString("ar-SA")}</p>
    </div>
  </div>

  <div class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="padding:12px 36px;font-size:16px;background:#127443;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;">🖨️ طباعة</button>
    <button onclick="window.close()" style="padding:12px 36px;font-size:16px;background:#666;color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;margin-right:10px;">إغلاق</button>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <script>
    try {
      JsBarcode('#barcode', '${u}', {
        format: 'CODE128', width: 2, height: 50,
        displayValue: true, fontSize: 14, margin: 5,
        background: 'transparent', lineColor: '#127443'
      });
    } catch(e) { console.error('JsBarcode error', e); document.getElementById('barcode').outerHTML = '<div style="font-size:18px;letter-spacing:6px;font-weight:bold;color:#127443;">${u}</div>'; }
    setTimeout(function() { window.print(); }, 600);
  <\/script>
</body>
</html>`}function Ie(n,a){if(!n)return;const r=`
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
    <img src="/thara-app/logo222.jpg" alt="" class="logo" onerror="this.style.display='none'">
    <h1>اختيار نموذج الفاتورة</h1>
    <p>طلب رقم #${String(n.id).slice(-6)}</p>
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
  <\/script>
</body>
</html>`,s=window.open("","_blank","width=550,height=650,scrollbars=no");s&&(s.document.write(r),s.document.close(),window.__printFormat=function(p){s.close();const m=p==="cashier"?Se(n,a):Te(n,a),o=window.open("","_blank","width="+(p==="cashier"?"550":"900")+",height=700,scrollbars=yes");o&&(o.document.write(m),o.document.close())})}const re=["جديد","قيد التحضير","جاهز للتوصيل","في الطريق","تم التوصيل","مكتمل"],W=50;function Ee({orders:n,updateOrderStatus:a,staffRole:r,currentStaff:s,isDriver:p,drivers:m,assignDriverToOrder:o,claimOrder:f,allCustomers:h=[],staffList:S=[]}){const{chatMessages:u,sendMessage:$,sendTyping:T,typingUsers:I,markMessagesAsRead:x,retrySendMessage:F,archiveOrder:me,restoreOrder:ge,archivedOrders:E,loadArchivedOrders:he}=g.useContext(ze),[xe,be]=g.useState({}),[U,j]=g.useState(null),[b,q]=g.useState(null),[D,A]=g.useState(""),[X,ue]=g.useState(!1),[M,fe]=g.useState(!1),[N,H]=g.useState("available"),[J,_]=g.useState(null),[Y,ve]=g.useState(W),[G,ye]=g.useState(W),[ee,te]=g.useState("30");if(g.useEffect(()=>{M&&E.length===0&&he()},[M]),g.useEffect(()=>{if(!b)return;const e=u.filter(i=>(!i.orderId||i.orderId===b)&&i.sender==="customer"&&i.status!=="read").map(i=>i.id);e.length>0&&x(e)},[b]),n.length===0)return t.jsx("h3",{className:"empty-orders",children:"لا توجد طلبات حالياً."});const v={newOrders:n.filter(e=>e.status==="جديد").length,preparing:n.filter(e=>e.status==="قيد التحضير").length,ready:n.filter(e=>e.status==="جاهز للتوصيل").length,onRoute:n.filter(e=>e.status==="في الطريق").length,delivered:n.filter(e=>e.status==="تم التوصيل").length,completed:n.filter(e=>e.status==="مكتمل").length,revenue:n.filter(e=>e.status!=="ملغي").reduce((e,i)=>e+Number(i.total||0),0)},ne=(e,i)=>{const d=re.indexOf(e.status),c=re.indexOf(i);if(i!=="ملغي"&&c<d){if(c<d-1){y("لا يمكن إرجاع الطلب أكثر من خطوة واحدة","error");return}j({text:`هل أنت متأكد من إرجاع الطلب #${e.id.slice(-6)} من "${e.status}" إلى "${i}"؟`,onConfirm:()=>{j(null),w(e,i)}});return}if(i!=="ملغي"&&c>d){j({text:`تغيير حالة الطلب #${e.id.slice(-6)} إلى "${i}"؟`,onConfirm:()=>{j(null),w(e,i)}});return}if(i==="ملغي"){j({text:`هل أنت متأكد من إلغاء الطلب #${e.id.slice(-6)}؟`,onConfirm:()=>{j(null),w(e,"ملغي")}});return}},w=(e,i)=>{if(i==="في الطريق"){_(e),te("30");return}let d=xe[e.id];try{a(e.id,i,d?Number(d):void 0)}catch(c){y(c.message,"error")}},je=()=>{const e=J;if(!e)return;const i=ee;if(!i||isNaN(i)||Number(i)<=0){y("الرجاء إدخال وقت توصيل صحيح","warning");return}be(d=>({...d,[e.id]:i})),a(e.id,"في الطريق",Number(i)),_(null)},ie=e=>u.filter(i=>!i.orderId||i.orderId===e),R=r==="driver"?"driver":"admin",B=n.filter(e=>e.status!=="مكتمل"),k=n.filter(e=>e.status==="مكتمل"),we=e=>e==="جديد"?"status-new":e==="قيد التحضير"?"status-preparing":e==="جاهز للتوصيل"?"status-ready":e==="في الطريق"?"status-route":e==="تم التوصيل"?"status-delivered":e==="ملغي"?"status-cancelled":e==="مكتمل"?"status-completed":"",Ne=(e,{showMap:i=!0}={})=>{const d=K(e.location);if(!d)return e.location?t.jsxs("p",{className:"order-location-missing",children:["الموقع: ",e.location]}):null;const c=se(d);return t.jsxs("div",{className:"order-location-block",children:[i&&t.jsx(Ce,{lat:d.lat,lng:d.lng}),t.jsxs("div",{className:"admin-location-actions",children:[t.jsx("a",{href:c.googleDir,target:"_blank",rel:"noopener noreferrer",className:"map-link map-link-google",children:"📍 توجيه Google Maps"}),t.jsx("a",{href:c.osmView,target:"_blank",rel:"noopener noreferrer",className:"map-link map-link-osm",children:"🗺️ عرض OpenStreetMap"})]})]})},ke=e=>e.assignedDriverId?e.status==="جديد"?t.jsx("button",{type:"button",className:"btn driver-action-btn",onClick:()=>w(e,"قيد التحضير"),children:"تجهيز الطلب"}):e.status==="قيد التحضير"?t.jsx("button",{type:"button",className:"btn driver-action-btn driver-action-route",onClick:()=>w(e,"في الطريق"),children:"بدء التوصيل"}):e.status==="في الطريق"?t.jsx("button",{type:"button",className:"btn driver-action-btn driver-action-done",onClick:()=>w(e,"تم التوصيل"),children:"تم التوصيل"}):e.status==="تم التوصيل"?t.jsx("span",{className:"driver-status-done",style:{color:"#fbbf24"},children:"بانتظار تأكيد الإدارة"}):t.jsx("span",{className:"driver-status-done",children:"مكتمل"}):t.jsx("button",{type:"button",className:"btn driver-action-btn driver-action-claim",onClick:async()=>{if(window.confirm("هل أنت متأكد من رغبتك في قبول واستلام هذا الطلب لتوصيله؟"))try{await f(e.id),y("تم قبول الطلب بنجاح","success")}catch(i){y("فشل قبول الطلب: "+(i.message||"خطأ غير معروف"),"error")}},style:{backgroundColor:"#127443",color:"#fff",fontWeight:"bold"},children:"قبول واستلام الطلب"}),z=(e,{compact:i=!1}={})=>{var d,c;return t.jsxs("div",{className:`admin-card order-card ${e.status==="مكتمل"||e.status==="تم التوصيل"?"order-card-completed":"order-card-active"} ${we(e.status)}`,children:[t.jsxs("div",{className:"admin-card-header",children:[t.jsxs("div",{children:[t.jsx("strong",{children:"طلب رقم:"})," #",e.id.slice(-6)," ",t.jsx("br",{}),t.jsx("small",{children:new Date(e.date).toLocaleString("ar-SA")}),e.estimatedDelivery&&t.jsxs("div",{className:"admin-eta-badge",children:["🕐 التوصيل خلال ",e.estimatedDelivery," دقيقة"]})]}),t.jsxs("div",{className:"admin-order-right",style:{textAlign:"left"},children:[t.jsx("strong",{children:"الإجمالي:"})," ",t.jsxs("span",{className:"order-total-text",children:[e.total.toFixed(2)," ر.س"]}),t.jsx("br",{}),!i&&(p?ke(e):r==="manager"||r==="employee"?e.status==="جديد"?t.jsx("button",{onClick:()=>w(e,"قيد التحضير"),className:"btn btn-accept",children:"استلام الطلب"}):e.status==="تم التوصيل"?t.jsx("button",{onClick:()=>w(e,"مكتمل"),className:"btn btn-accept",style:{background:"#10b981"},children:"✅ تأكيد التوصيل"}):t.jsxs("select",{value:e.status,onChange:l=>ne(e,l.target.value),className:"order-status-select",children:[t.jsx("option",{value:"جديد",children:"جديد"}),t.jsx("option",{value:"قيد التحضير",children:"قيد التحضير"}),t.jsx("option",{value:"جاهز للتوصيل",children:"جاهز للتوصيل"}),t.jsx("option",{value:"في الطريق",children:"في الطريق"}),t.jsx("option",{value:"تم التوصيل",children:"تم التوصيل"}),t.jsx("option",{value:"مكتمل",children:"مكتمل"}),t.jsx("option",{value:"ملغي",children:"ملغي"})]}):e.status==="جديد"?t.jsx("button",{onClick:()=>w(e,"قيد التحضير"),className:"btn btn-accept",children:"استلام الطلب"}):e.status==="تم التوصيل"?t.jsx("button",{onClick:()=>w(e,"مكتمل"),className:"btn btn-accept",style:{background:"#10b981"},children:"✅ تأكيد التوصيل"}):t.jsxs("select",{value:e.status,onChange:l=>ne(e,l.target.value),className:"order-status-select",children:[t.jsx("option",{value:"جديد",children:"جديد"}),t.jsx("option",{value:"قيد التحضير",children:"قيد التحضير"}),t.jsx("option",{value:"جاهز للتوصيل",children:"جاهز للتوصيل"}),t.jsx("option",{value:"في الطريق",children:"في الطريق"}),t.jsx("option",{value:"تم التوصيل",children:"تم التوصيل"}),t.jsx("option",{value:"مكتمل",children:"مكتمل"}),t.jsx("option",{value:"ملغي",children:"ملغي"})]}))]})]}),!i&&t.jsxs("div",{children:[t.jsx("strong",{children:"المنتجات المطلوبة:"}),t.jsx("ul",{className:"order-items-list",children:e.items.map(l=>t.jsxs("li",{children:[l.name," (الكمية: ",l.qty,")"]},l.id))})]}),t.jsxs("div",{className:"admin-card-info",children:[t.jsxs("div",{className:"customer-contact-block",style:{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:"10px",padding:"0.75rem",marginBottom:"0.75rem"},children:[t.jsx("div",{style:{fontSize:"0.8rem",fontWeight:700,color:"#34d399",marginBottom:"0.4rem"},children:"👤 معلومات العميل"}),e.phone&&t.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.4rem",flexWrap:"wrap",marginBottom:"0.25rem"},children:[t.jsx("strong",{style:{fontSize:"0.85rem",color:"#e2e8f0"},children:"📞 الجوال:"}),t.jsx("span",{dir:"ltr",style:{fontSize:"1rem",fontWeight:700,color:"#f1f5f9"},children:e.phone}),t.jsx("a",{href:`tel:${e.phone}`,style:{fontSize:"0.75rem",padding:"0.2rem 0.5rem",borderRadius:"6px",background:"rgba(16,185,129,0.2)",color:"#34d399",textDecoration:"none"},children:"📞 اتصال"}),t.jsx("a",{href:`https://wa.me/${e.phone.replace(/^0/,"966")}`,target:"_blank",rel:"noopener noreferrer",style:{fontSize:"0.75rem",padding:"0.2rem 0.5rem",borderRadius:"6px",background:"rgba(34,197,94,0.2)",color:"#4ade80",textDecoration:"none"},children:"💬 واتساب"})]}),e.deliveryAddress&&t.jsxs("div",{style:{fontSize:"0.85rem",color:"#cbd5e1",marginTop:"0.2rem"},children:[t.jsx("strong",{children:"📍 العنوان:"})," ",e.deliveryAddress]})]}),t.jsx("strong",{children:"الدفع:"})," ",e.paymentMethod,e.notes&&!i&&t.jsxs(t.Fragment,{children:[t.jsx("br",{}),t.jsx("strong",{children:"ملاحظات:"})," ",e.notes]}),!i&&Ne(e,{showMap:!i}),i&&K(e.location)&&t.jsx("div",{className:"admin-location-actions",style:{marginTop:"0.5rem"},children:t.jsx("a",{href:se(K(e.location)).googleDir,target:"_blank",rel:"noopener noreferrer",className:"map-link",children:"📍 خرائط"})}),!i&&!p&&(r==="admin"||r==="manager")&&t.jsxs("div",{className:"admin-assign-driver-block",style:{marginTop:"0.75rem",padding:"0.5rem",background:"rgba(255,255,255,0.05)",borderRadius:"6px",display:"flex",alignItems:"center",flexWrap:"wrap",gap:"0.5rem"},children:[t.jsx("strong",{style:{fontSize:"0.85rem",color:"#94a3b8"},children:"🚚 تعيين الكابتن:"}),t.jsxs("select",{value:e.assignedDriverId||"",onChange:async l=>{const O=l.target.value;try{await o(e.id,O?Number(O):null),y("تم تحديث تعيين الكابتن بنجاح","success")}catch(L){y("فشل تعيين الكابتن: "+(L.message||"خطأ غير معروف"),"error")}},style:{padding:"0.25rem 0.5rem",fontSize:"0.85rem",borderRadius:"4px",background:"#0f172a",color:"#e2e8f0",border:"1px solid rgba(255,255,255,0.1)",fontFamily:"inherit"},children:[t.jsx("option",{value:"",children:"-- غير معين --"}),m.map(l=>t.jsx("option",{value:l.id,children:l.name||l.email},l.id))]}),e.assignedDriverId&&t.jsxs("span",{style:{fontSize:"0.8rem",color:"#10b981",fontWeight:"bold"},children:["✓ معين لـ ",((d=m.find(l=>String(l.id)===String(e.assignedDriverId)))==null?void 0:d.name)||"كابتن"]})]}),!i&&p&&e.assignedDriverId&&t.jsxs("div",{style:{marginTop:"0.5rem",fontSize:"0.85rem",color:"#fbbf24"},children:["🏍️ الكابتن المكلف بالطلب: ",t.jsx("strong",{children:String(e.assignedDriverId)===String(s==null?void 0:s.id)?"أنت":((c=m.find(l=>String(l.id)===String(e.assignedDriverId)))==null?void 0:c.name)||"كابتن آخر"})]}),t.jsxs("div",{style:{marginTop:"0.4rem"},children:[t.jsx("button",{type:"button",className:"chat-order-btn",onClick:()=>q(e.id),children:"💬 محادثة الطلب"}),t.jsx("button",{type:"button",className:"chat-order-btn",style:{marginRight:"0.4rem"},onClick:()=>Ie(e,{currentStaff:s,drivers:m,customers:h,staffList:S}),children:"🖨️ طباعة الفاتورة"}),!i&&r==="admin"&&t.jsx("button",{type:"button",className:"admin-delete-btn",style:{marginTop:"0.4rem"},onClick:()=>{j({text:`هل أنت متأكد من أرشفة الطلب #${String(e.id).slice(-6)}؟`,onConfirm:async()=>{j(null);try{await me(e.id),y("تم أرشفة الطلب بنجاح","success")}catch(l){y("فشل أرشفة الطلب: "+(l.message||""),"error")}}})},children:"📦 أرشفة الطلب"})]})]})]},e.id)};return t.jsxs("div",{children:[U&&t.jsx("div",{className:"confirm-overlay",onClick:()=>j(null),children:t.jsxs("div",{className:"confirm-dialog",onClick:e=>e.stopPropagation(),children:[t.jsx("p",{children:U.text}),t.jsxs("div",{className:"confirm-actions",children:[t.jsx("button",{className:"confirm-btn confirm-yes",onClick:U.onConfirm,children:"تأكيد"}),t.jsx("button",{className:"confirm-btn confirm-no",onClick:()=>j(null),children:"إلغاء"})]})]})}),b&&t.jsx("div",{className:"confirm-overlay",onClick:()=>{q(null),A("")},children:t.jsxs("div",{className:"order-chat-dialog",onClick:e=>e.stopPropagation(),children:[t.jsxs("div",{className:"order-chat-header",children:[t.jsxs("strong",{children:["محادثة الطلب #",b.slice(-6)]}),t.jsx("button",{className:"chat-close-btn",onClick:()=>{q(null),A("")},children:"✕"})]}),t.jsxs("div",{className:"order-chat-body",children:[ie(b).length===0&&t.jsx("p",{className:"empty-chat",children:"لا توجد رسائل بعد."}),ie(b).map(e=>{const i=e.sender===R,d=c=>{var l;if(c.sender===R)return c.senderName||"أنت";if(c.sender==="customer")return"العميل";if(c.sender==="driver"){const O=n.find(Z=>Z.id===b),L=c.senderName||(O?(l=m.find(Z=>String(Z.id)===String(O.assignedDriverId)))==null?void 0:l.name:null);return L?`الكابتن (${L})`:"الكابتن"}return c.sender==="admin"?c.senderName||"المتجر / الدعم":c.sender};return t.jsxs("div",{className:`admin-bubble ${i?"admin":"customer"}`,children:[t.jsx("div",{className:"admin-bubble-sender",children:d(e)}),t.jsx("div",{children:e.text}),t.jsxs("div",{className:"admin-bubble-time",children:[i&&t.jsx("span",{style:{fontSize:"0.65rem",marginRight:"0.2rem"},children:e._failed?t.jsx("button",{onClick:()=>F(e.id),style:{color:"#ef4444",background:"none",border:"none",cursor:"pointer",padding:0,textDecoration:"underline",fontSize:"0.65rem"},children:"⚠️ إعادة"}):e.status==="read"?t.jsx("span",{title:"مقروءة",style:{color:"#34c759"},children:"✓✓"}):t.jsx("span",{title:"تم الإرسال",style:{color:"#94a3b8"},children:"✓"})}),e.time]})]},e.id)}),I[b]&&t.jsxs("div",{className:"admin-bubble customer",style:{opacity:.6},children:[t.jsx("div",{className:"admin-bubble-sender",children:"العميل"}),t.jsx("div",{style:{fontStyle:"italic",color:"#94a3b8"},children:"يكتب..."})]})]}),t.jsxs("div",{className:"order-chat-input",children:[t.jsx("input",{type:"text",value:D,onChange:e=>{A(e.target.value),T(b,null)},onKeyDown:e=>{if(e.key==="Enter"&&D.trim()){const i=n.find(d=>d.id===b);$(R,D,b,null,s==null?void 0:s.name,i==null?void 0:i.phone),A("")}},placeholder:"اكتب رسالة..."}),t.jsx("button",{onClick:()=>{if(D.trim()){const e=n.find(i=>i.id===b);$(R,D,b,null,s==null?void 0:s.name,e==null?void 0:e.phone),A("")}},children:"إرسال"})]})]})}),J&&t.jsx("div",{className:"confirm-overlay",onClick:()=>_(null),children:t.jsxs("div",{className:"confirm-dialog",onClick:e=>e.stopPropagation(),style:{background:"#0a2e1a",border:"1px solid rgba(255,255,255,0.15)"},children:[t.jsx("p",{style:{marginBottom:"0.75rem",fontWeight:700,color:"#ffffff",fontSize:"1rem"},children:"⏱ وقت التوصيل المقدر"}),t.jsxs("p",{style:{marginBottom:"1rem",color:"#cbd5e1",fontSize:"0.85rem"},children:["أدخل الوقت المتوقع للتوصيل بالدقائق للطلب #",J.id.slice(-6)]}),t.jsx("input",{type:"number",value:ee,onChange:e=>te(e.target.value),min:"1",max:"180",style:{width:"100%",padding:"0.75rem 1rem",border:"1.5px solid rgba(255,255,255,0.15)",borderRadius:"12px",fontSize:"1.1rem",fontFamily:"inherit",background:"rgba(0,0,0,0.3)",color:"#ffffff",outline:"none",marginBottom:"1rem",boxSizing:"border-box",textAlign:"center"}}),t.jsxs("div",{className:"confirm-actions",children:[t.jsx("button",{className:"confirm-btn confirm-yes",onClick:je,style:{background:"linear-gradient(135deg, #fbbf24, #f59e0b)",color:"#451a03",fontWeight:800},children:"تأكيد وبدء التوصيل"}),t.jsx("button",{className:"confirm-btn confirm-no",onClick:()=>_(null),style:{background:"rgba(255,255,255,0.1)",color:"#ffffff"},children:"إلغاء"})]})]})}),t.jsx("h2",{className:"admin-section-title orders-title",children:p?"طلبات التوصيل":"إدارة الطلبات"}),p?t.jsxs("div",{className:"driver-stats-container",style:{display:"flex",gap:"0.5rem",marginBottom:"1.5rem",width:"100%"},children:[t.jsxs("div",{className:"admin-stat-card",style:{flex:"1",backgroundColor:N==="available"?"rgba(37, 99, 235, 0.4)":"rgba(37, 99, 235, 0.15)",borderColor:N==="available"?"#3b82f6":"rgba(37, 99, 235, 0.3)",padding:"0.75rem 0.25rem",textAlign:"center",alignItems:"center",cursor:"pointer",transition:"all 0.2s"},onClick:()=>H("available"),children:[t.jsxs("span",{style:{fontSize:"0.75rem",color:"#fff",marginBottom:"0.25rem",display:"flex",alignItems:"center",justifyContent:"center",gap:"4px"},children:["متاحة ",v.newOrders+v.preparing>0&&t.jsx("span",{className:"bell-ring",children:"🔔"})]}),t.jsx("strong",{style:{fontSize:"1.25rem",color:"#fff"},children:v.newOrders+v.preparing})]}),t.jsxs("div",{className:"admin-stat-card",style:{flex:"1",backgroundColor:N==="assigned"?"rgba(139, 92, 246, 0.4)":"rgba(139, 92, 246, 0.15)",borderColor:N==="assigned"?"#c084fc":"rgba(139, 92, 246, 0.3)",padding:"0.75rem 0.25rem",textAlign:"center",alignItems:"center",cursor:"pointer",transition:"all 0.2s"},onClick:()=>H("assigned"),children:[t.jsx("span",{style:{fontSize:"0.75rem",color:"#fff",marginBottom:"0.25rem"},children:"مكلف بها"}),t.jsx("strong",{style:{fontSize:"1.25rem",color:"#fff"},children:v.onRoute})]}),t.jsxs("div",{className:"admin-stat-card",style:{flex:"1",backgroundColor:N==="completed"?"rgba(16, 185, 129, 0.4)":"rgba(16, 185, 129, 0.15)",borderColor:N==="completed"?"#34d399":"rgba(16, 185, 129, 0.3)",padding:"0.75rem 0.25rem",textAlign:"center",alignItems:"center",cursor:"pointer",transition:"all 0.2s"},onClick:()=>H("completed"),children:[t.jsx("span",{style:{fontSize:"0.75rem",color:"#fff",marginBottom:"0.25rem"},children:"مكتملة"}),t.jsx("strong",{style:{fontSize:"1.25rem",color:"#fff"},children:v.completed})]})]}):t.jsxs("div",{className:"admin-stats-grid",children:[t.jsxs("div",{className:"admin-stat-card",children:[t.jsx("span",{children:"طلبات جديدة"}),t.jsx("strong",{children:v.newOrders})]}),t.jsxs("div",{className:"admin-stat-card",children:[t.jsx("span",{children:"قيد التحضير"}),t.jsx("strong",{children:v.preparing})]}),t.jsxs("div",{className:"admin-stat-card",children:[t.jsx("span",{children:"تم التوصيل"}),t.jsx("strong",{children:v.delivered})]}),t.jsxs("div",{className:"admin-stat-card",children:[t.jsx("span",{children:"مكتملة"}),t.jsx("strong",{children:v.completed})]}),t.jsxs("div",{className:"admin-stat-card",children:[t.jsx("span",{children:"المبيعات"}),t.jsxs("strong",{children:[v.revenue.toFixed(2)," ر.س"]})]})]}),p?t.jsxs("div",{className:"driver-tab-content",style:{minHeight:"300px"},children:[N==="available"&&t.jsxs(t.Fragment,{children:[t.jsxs("h3",{className:"driver-sub-title",style:{marginTop:"0.5rem",marginBottom:"1rem",color:"#3b82f6",fontWeight:"bold"},children:["📦 طلبات متوفرة ومتاحة للتوصيل (",n.filter(e=>e.status!=="مكتمل"&&!e.assignedDriverId).length,")"]}),t.jsx("div",{className:"admin-orders-list",children:n.filter(e=>e.status!=="مكتمل"&&!e.assignedDriverId).length===0?t.jsx("div",{className:"empty-orders",style:{color:"#fff"},children:"لا توجد طلبات متوفرة للتوصيل حالياً."}):n.filter(e=>e.status!=="مكتمل"&&!e.assignedDriverId).map(e=>z(e))})]}),N==="assigned"&&t.jsxs(t.Fragment,{children:[t.jsxs("h3",{className:"driver-sub-title",style:{marginTop:"0.5rem",marginBottom:"1rem",color:"#c084fc",fontWeight:"bold"},children:["🏍️ طلباتي المكلف بها حالياً (",n.filter(e=>e.status!=="مكتمل"&&e.assignedDriverId&&String(e.assignedDriverId)===String(s==null?void 0:s.id)).length,")"]}),t.jsx("div",{className:"admin-orders-list",children:n.filter(e=>e.status!=="مكتمل"&&e.assignedDriverId&&String(e.assignedDriverId)===String(s==null?void 0:s.id)).length===0?t.jsx("div",{className:"empty-orders",style:{color:"#fff"},children:"لا توجد لديك طلبات جارية مكلف بها حالياً."}):n.filter(e=>e.status!=="مكتمل"&&e.assignedDriverId&&String(e.assignedDriverId)===String(s==null?void 0:s.id)).map(e=>z(e))})]}),N==="completed"&&t.jsxs(t.Fragment,{children:[t.jsxs("h3",{className:"driver-sub-title",style:{marginTop:"0.5rem",marginBottom:"1rem",color:"#34d399",fontWeight:"bold"},children:["✅ أرشيف الطلبات المكتملة (",k.length,")"]}),t.jsx("div",{className:"admin-orders-list completed-orders-list",children:k.length===0?t.jsx("div",{className:"empty-orders",style:{color:"#fff"},children:"لا توجد طلبات مكتملة."}):k.map(e=>z(e,{compact:!0}))})]})]}):t.jsxs("div",{className:"admin-orders-list",children:[B.length===0&&t.jsx("div",{className:"empty-orders",children:"لا توجد طلبات نشطة حالياً."}),B.slice(0,Y).map(e=>z(e)),B.length>Y&&t.jsx("div",{style:{textAlign:"center",margin:"1rem 0"},children:t.jsxs("button",{onClick:()=>ve(e=>e+W),style:{background:"#127443",color:"#fff",border:"none",padding:"0.6rem 1.5rem",borderRadius:"8px",cursor:"pointer",fontSize:"0.9rem"},children:["تحميل المزيد (",B.length-Y," متبقي)"]})})]}),k.length>0&&!p&&t.jsxs("div",{className:"completed-orders-section",children:[t.jsxs("button",{className:"completed-toggle-btn",onClick:()=>ue(e=>!e),children:[X?"▾":"▸"," الطلبات المكتملة (",k.length,")"]}),X&&t.jsxs("div",{className:"admin-orders-list completed-orders-list",children:[k.slice(0,G).map(e=>z(e,{compact:!0})),k.length>G&&t.jsx("div",{style:{textAlign:"center",margin:"1rem 0"},children:t.jsxs("button",{onClick:()=>ye(e=>e+W),style:{background:"#127443",color:"#fff",border:"none",padding:"0.6rem 1.5rem",borderRadius:"8px",cursor:"pointer",fontSize:"0.9rem"},children:["تحميل المزيد (",k.length-G," متبقي)"]})})]})]}),r==="admin"&&t.jsxs("div",{className:"completed-orders-section",style:{marginTop:"0.75rem"},children:[t.jsxs("button",{className:"completed-toggle-btn",onClick:()=>fe(e=>!e),style:{borderColor:"#64748b"},children:[M?"▾":"▸"," 📦 أرشيف الطلبات (",E.length,")"]}),M&&t.jsx("div",{className:"admin-orders-list completed-orders-list",children:E.length===0?t.jsx("div",{className:"empty-orders",style:{color:"#64748b"},children:"لا توجد طلبات في الأرشيف."}):E.map(e=>t.jsxs("div",{style:{position:"relative"},children:[z(e,{compact:!0}),t.jsx("div",{style:{padding:"0 0.75rem 0.75rem",marginTop:"-0.5rem"},children:t.jsx("button",{type:"button",className:"chat-order-btn",onClick:async()=>{try{await ge(e.id),y("تم استعادة الطلب","success")}catch{y("فشل استعادة الطلب","error")}},children:"↩️ استعادة الطلب"})})]},e.id))})]})]})}export{Ee as default};
