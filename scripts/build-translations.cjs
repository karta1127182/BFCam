const fs = require('fs');
const table = {};
for (const line of fs
  .readFileSync('src/i18n/translations.txt', 'utf8')
  .replace(/^\uFEFF/, '')
  .trim()
  .split(/\r?\n/)) {
  const [key, ...values] = line.split('|');
  if (values.length !== 3) throw Error(line);
  table[key] = values;
}
const terms = fs
  .readFileSync('src/i18n/pose-terms.txt', 'utf8')
  .replace(/^\uFEFF/, '')
  .trim()
  .split(/\r?\n/)
  .map(l => l.split('|'))
  .sort((a, b) => b[0].length - a[0].length);
for (const key of JSON.parse(
  fs.readFileSync('src/i18n/source-strings.json', 'utf8'),
)) {
  if (table[key] || !/^(女生|男生|情侶)/.test(key) || /[，。；]/.test(key))
    continue;
  let rest = key;
  const chunks = [];
  while (rest) {
    const term = terms.find(t => rest.startsWith(t[0]));
    if (!term) throw Error('Missing pose term: ' + rest + ' in ' + key);
    chunks.push(term.slice(1));
    rest = rest.slice(term[0].length);
  }
  table[key] = [0, 1, 2].map(i =>
    chunks.map(c => c[i]).join(i === 0 ? ' · ' : '・'),
  );
}
fs.writeFileSync(
  'src/i18n/translations.json',
  JSON.stringify(table, null, 2) + '\n',
);
