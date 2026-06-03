const https = require('https');
const PAT = 'sbp_04640e51a602f3e9b564d5d334967ac49a87e454';
const REF = 'oqwphazzuxmrxwbnothk';
function runSql(sql) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ query: sql });
    const req = https.request({ hostname: 'api.supabase.com', path: '/v1/projects/' + REF + '/database/query', method: 'POST', headers: { 'Authorization': 'Bearer ' + PAT, 'Content-Type': 'application/json' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { if (res.statusCode >= 400) reject(new Error(res.statusCode + ': ' + d)); else resolve(JSON.parse(d)); });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}
(async () => {
  const policies = await runSql("SELECT schemaname, tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname");
  console.log(JSON.stringify(policies, null, 2));
})();
