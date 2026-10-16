// Photographs data/orography.html (made by tools/orography.mjs) for a status report (run by the browser-automation skill):
//   node <skill>/browser.mjs "file://$PWD/data/orography.html" --timeout 15000 --script tools/orography-shot.mjs
// Saves reports/status/img/latest-orography.png; rename it to the report's name when writing it.
import path from 'node:path';
export default async function run(page) {
  await page.setViewportSize({ width: 980, height: 740 });
  await page.waitForTimeout(800);
  await page.locator('#c').screenshot({ path: path.join(process.cwd(), 'reports', 'status', 'img', 'latest-orography.png') });
  return 'orography saved';
}
