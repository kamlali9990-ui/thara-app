const https = require('https');
const fs = require('fs');
const path = require('path');

const PAT = process.env.SUPABASE_ACCESS_TOKEN;
if (!PAT) { process.exit(1); }
const PROJECT_REF = 'oqwphazzuxmrxwbnothk';
const FXN = 'cloudinary-sign';
const DIR = path.join(__dirname, '..', 'supabase', 'functions', FXN);
const ENTRY = 'index.ts';

function api(method, urlPath, ct, body) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'api.supabase.com', path: urlPath, method,
      headers: { Authorization: `Bearer ${PAT}` },
    };
    if (ct) opts.headers['Content-Type'] = ct;
    if (body) opts.headers['Content-Length'] = (Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body));
    const r = https.request(opts, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ s: res.statusCode, b: JSON.parse(d) }); } catch { resolve({ s: res.statusCode, b: d }); } });
    });
    r.on('error', e => resolve({ s: 0, b: e.message }));
    if (body) r.write(body);
    r.end();
  });
}

function multipart(boundary, parts) {
  let bufs = [];
  for (const p of parts) {
    let header = `--${boundary}\r\nContent-Disposition: form-data; name="${p.name}"`;
    if (p.filename) header += `; filename="${p.filename}"`;
    if (p.type) header += `\r\nContent-Type: ${p.type}`;
    header += '\r\n\r\n';
    bufs.push(Buffer.from(header, 'utf-8'));
    bufs.push(Buffer.isBuffer(p.value) ? p.value : Buffer.from(p.value, 'utf-8'));
    bufs.push(Buffer.from('\r\n', 'utf-8'));
  }
  bufs.push(Buffer.from(`--${boundary}--\r\n`, 'utf-8'));
  return Buffer.concat(bufs);
}

(async () => {
  const code = fs.readFileSync(path.join(DIR, ENTRY), 'utf-8');
  const metadata = JSON.stringify({ entrypoint_path: ENTRY, verify_jwt: false, name: FXN });
  const boundary = `----${Date.now()}`;
  const body = multipart(boundary, [
    { name: 'metadata', value: metadata },
    { name: 'file', value: code, filename: ENTRY, type: 'application/vnd.deno.entrypoint' },
  ]);
  const r = await api('POST', `/v1/projects/${PROJECT_REF}/functions/deploy?slug=${FXN}`, `multipart/form-data; boundary=${boundary}`, body);
  console.log(`Deploy: (${r.s})`, JSON.stringify(r.b || '').substring(0, 300));

  if (r.s < 400) {
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
    const r3 = await new Promise((resolve) => {
      const r = https.request({ hostname: `${PROJECT_REF}.supabase.co`, path: '/functions/v1/cloudinary-sign', method: 'POST', headers: { Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' } }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ s: res.statusCode, b: d })); });
      r.on('error', e => resolve({ s: 0, b: e.message }));
      r.write(JSON.stringify({ upload_preset: 'test' })); r.end();
    });
    console.log(`Test: (${r3.s})`, r3.b);
  }
})().catch(e => console.error('💥', e));
