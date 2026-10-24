// Prints a compact summary of a Jest JSON report: totals, then each failing test with the
// first lines of its error (component-tree dumps cut off). Used by the GitHub check so the
// commit annotation shows what failed instead of a long render tree.
//   usage: node tools/jest-summary.mjs <jest-results.json>
import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const strip = (s) => s.replace(/\u001b\[[0-9;]*m/g, '');
const totals =
  `Tests: ${report.numPassedTests} passed, ${report.numFailedTests} failed, ${report.numTotalTests} total` +
  ` (suites failed: ${report.numFailedTestSuites})`;
console.log(totals);
const repeats = new Map();
const failures = [];
for (const file of report.testResults) {
  if (file.status === 'failed' && file.message && !file.assertionResults.some((a) => a.status === 'failed')) {
    // the whole file failed before any test ran (import error, syntax error …)
    console.log(`\n✗ ${file.name.replace(process.cwd() + '/', '')}`);
    console.log(strip(file.message).split('\n').slice(0, 25).join('\n'));
  }
  for (const a of file.assertionResults) {
    if (a.status !== 'failed') continue;
    const msg = strip(a.failureMessages.join('\n'));
    const lines = msg.split('\n');
    const cut = lines.findIndex((l) => /^\s*<\w/.test(l)); // start of a component-tree dump
    // first lines of the message, without stack frames
    const head = lines.slice(0, cut > 0 ? cut : lines.length).filter((l) => !/^\s+at /.test(l));
    const text = head.slice(0, 6).join('\n');
    const name = [...a.ancestorTitles, a.title].join(' › ');
    // The same error in many tests (often a follow-up of the first failure) is printed once,
    // with the number of further tests, so the first real error stays in the annotation.
    const seen = repeats.get(text);
    if (seen) {
      seen.count++;
      continue;
    }
    repeats.set(text, { count: 0 });
    failures.push({ name, text, entry: repeats.get(text) });
  }
}
for (const f of failures) {
  console.log(`\n✗ ${f.name}${f.entry.count ? `  (+${f.entry.count} more tests with the same error)` : ''}`);
  console.log(f.text);
}
console.log(`\n${totals}`); // repeated at the end: the annotation keeps the last lines
process.exitCode = report.success ? 0 : 1;
