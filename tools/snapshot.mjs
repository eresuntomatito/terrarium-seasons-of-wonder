// Photographs the live world for a status report (run by the browser-automation skill):
//   node <skill>/browser.mjs http://localhost:8000/ --timeout 15000 --script tools/snapshot.mjs
// Saves reports/status/img/latest-world.png (the world canvas) and latest-page.png (the whole viewer); rename them
// to the report's name when writing it.
import path from 'node:path';
const OUT = path.join(process.cwd(), 'reports', 'status', 'img');
export default async function run(page) {
  await page.setViewportSize({ width: 1500, height: 950 });
  await page.reload({ waitUntil: 'commit' }).catch(() => {});
  await page.waitForTimeout(7000); // frames arrive and the panels fill in
  await page.locator('#world').screenshot({ path: path.join(OUT, 'latest-world.png') });
  await page.screenshot({ path: path.join(OUT, 'latest-page.png') });
  return { clock: await page.evaluate(() => document.getElementById('clock')?.textContent) };
}
