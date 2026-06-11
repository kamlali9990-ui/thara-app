import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import fs from 'fs';

const dir = process.cwd();
const token = process.argv[2];

if (!token) {
  console.error('Usage: node push-to-github.mjs <github_pat>');
  process.exit(1);
}

async function main() {
  // 1. Check log
  const log = await git.log({ fs, dir, depth: 5 });
  console.log('أحدث commits:');
  for (const l of log) {
    console.log(`  ${l.oid.substring(0,7)} - ${l.commit.message.split('\n')[0]}`);
  }

  // 2. Status
  const status = await git.statusMatrix({ fs, dir });
  const changed = status.filter(([filepath, head, workdir, stage]) => head !== workdir || head !== stage || stage !== workdir);
  console.log('\nالملفات المتغيرة:');
  for (const [fpath] of changed) {
    console.log(`  - ${fpath}`);
  }

  // 3. Add all
  console.log('\n1. إضافة الملفات...');
  for (const [fpath] of changed) {
    if (fpath.startsWith('dist/')) continue;
    await git.add({ fs, dir, filepath: fpath });
    console.log(`   added: ${fpath}`);
  }

  // 4. Commit
  console.log('\n2. إنشاء commit...');
  const sha = await git.commit({
    fs,
    dir,
    author: { name: 'kamlali9990-ui', email: 'kamlali9990@users.noreply.github.com' },
    message: 'تحسين: عرض الطلبات بشكل مربعات متجاورة مع ألوان ووميض حسب الحالة وعداد للرسائل غير المقروءة'
  });
  console.log(`   commit: ${sha.substring(0,7)}`);

  // 5. Push
  console.log('\n3. رفع إلى GitHub...');
  const remote = 'https://github.com/kamlali9990-ui/thara-app.git';
  const pushResult = await git.push({
    fs,
    dir,
    http,
    onAuth: () => ({ username: token, password: '' }),
    url: remote,
    remote: 'origin',
    ref: 'main',
    force: false,
  });
  console.log('   push result:', pushResult);
  if (pushResult.errors && pushResult.errors.length > 0) {
    console.error('   اخطاء:', pushResult.errors);
  } else {
    console.log('✅ تم الرفع بنجاح!');
  }
}

main().catch(err => {
  console.error('فشل:', err.message);
  process.exit(1);
});
