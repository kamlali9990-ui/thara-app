const https = require('https');
const PAT = 'sbp_04640e51a602f3e9b564d5d334967ac49a87e454';
const REF = 'oqwphazzuxmrxwbnothk';
function api(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'api.supabase.com', path, method, headers: { 'Authorization': 'Bearer ' + PAT, 'Content-Type': 'application/json' } };
    const req = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { if (res.statusCode >= 400) reject(new Error(res.statusCode + ': ' + d)); else resolve(JSON.parse(d)); }); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
(async () => {
  // Check existing secrets/env vars for the project
  try {
    const secrets = await api('/v1/projects/' + REF + '/secrets');
    console.log('Secrets:');
    for (const s of secrets) {
      console.log('  ' + s.name + ' = ' + (s.value ? s.value.substring(0, 20) + '...' : '(hidden)'));
    }
  } catch (e) { console.log('Secrets error:', e.message); }

  // Check the edge function
  try {
    const funcs = await api('/v1/projects/' + REF + '/functions');
    console.log('\nEdge Functions:');
    for (const f of funcs) {
      console.log('  ' + f.name + ' - status: ' + f.status + ' - slug: ' + (f.slug || '-'));
    }
  } catch (e) { console.log('Functions error:', e.message); }
})();
