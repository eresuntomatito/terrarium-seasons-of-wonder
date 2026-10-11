// † extinct in season 46.
// geneticgadget (S.5.1): written by claude-haiku after the galacticraptors (S.5) collapsed, in season 46.
// lesson the mystics (S.3) lasted 0.3 days, grew to 4, killed 4; then 4 starved, 0 were eaten, 0 died old. 229 plant-eaters were left.
// lesson the zephyrs (S.3.1) lasted 0.2 days, grew to 4, killed 0; then 4 starved, 0 were eaten, 0 died old. 159 plant-eaters were left.
// lesson the luminouslynxs (S.4) lasted 2.3 days, grew to 4, killed 55; then 0 starved, 0 were eaten, 4 died old. 36 plant-eaters were left.
// lesson the zephyr2s (S.4.1) lasted 0.5 days, grew to 4, killed 5; then 4 starved, 0 were eaten, 0 died old. 120 plant-eaters were left.
  You had designed them because you believed: "The last hunters died because their breeding condition required energy > 2.14 when maximum energy is 2—reproduction was impossible. Frozen at 4 individuals with no generational replacement, they hunted prey into collapse (307 → 24 in two days), then starved. The luminouslynxs survived longest by reaching natural death, suggesting their breeding worked, but the fatal pattern is clear: any threshold that cannot be reached means no population growth and inevitable ecosystem crash. The fix is setting mate to an achievable energy level (1.3), conditioning breeding on prey abundance (avgPrey > 2.3) to avoid desperate breeding during scarcity, and keeping the efficient hunting strategy with slightly more restraint so prey can replenish between generations."
// lesson the galacticraptors (S.5) lasted 2.6 days, grew to 2, killed 23; then 1 starved, 0 were eaten, 1 died old. 70 plant-eaters were left.
  You had designed them because you believed: "The luminouslynxs thrived for 2.3 days with 55 kills because they could not breed—their stable 4-individual population had no energy-draining reproduction. The zephyr2s and last hunters failed because breeding cost them 0.409–0.713 energy per child (20–35% of their 2-point maximum), forcing starvation when prey became scarce. With metabolism fixed by body size and prey limited, every child gift was a bet the parent would find enough food to survive; it almost never paid. The solution is to breed only when prey is demonstrably abundant (so the energy loss can be recovered) and to slash child energy from 0.4–0.7 down to 0.15–0.35, making reproduction a rare luxury affordable only when the ecosystem is booming."
// lesson the galacticraptors (S.5) lasted 2.2 days, grew to 2, killed 16; then 1 starved, 0 were eaten, 1 died old. 253 plant-eaters were left.
  You had designed them because you believed: "The luminouslynxs thrived for 2.3 days with 55 kills because they could not breed—their stable 4-individual population had no energy-draining reproduction. The zephyr2s and last hunters failed because breeding cost them 0.409–0.713 energy per child (20–35% of their 2-point maximum), forcing starvation when prey became scarce. With metabolism fixed by body size and prey limited, every child gift was a bet the parent would find enough food to survive; it almost never paid. The solution is to breed only when prey is demonstrably abundant (so the energy loss can be recovered) and to slash child energy from 0.4–0.7 down to 0.15–0.35, making reproduction a rare luxury affordable only when the ecosystem is booming."
// lesson the galacticraptors (S.5) lasted 2.1 days, grew to 2, killed 14; then 1 starved, 0 were eaten, 1 died old. 56 plant-eaters were left.
  You had designed them because you believed: "The luminouslynxs thrived for 2.3 days with 55 kills because they could not breed—their stable 4-individual population had no energy-draining reproduction. The zephyr2s and last hunters failed because breeding cost them 0.409–0.713 energy per child (20–35% of their 2-point maximum), forcing starvation when prey became scarce. With metabolism fixed by body size and prey limited, every child gift was a bet the parent would find enough food to survive; it almost never paid. The solution is to breed only when prey is demonstrably abundant (so the energy loss can be recovered) and to slash child energy from 0.4–0.7 down to 0.15–0.35, making reproduction a rare luxury affordable only when the ecosystem is booming."
// lesson the galacticraptors (S.5) lasted 5.4 days, grew to 4, killed 75; then 4 starved, 0 were eaten, 5 died old. 144 plant-eaters were left.
  You had designed them because you believed: "The luminouslynxs thrived for 2.3 days with 55 kills because they could not breed—their stable 4-individual population had no energy-draining reproduction. The zephyr2s and last hunters failed because breeding cost them 0.409–0.713 energy per child (20–35% of their 2-point maximum), forcing starvation when prey became scarce. With metabolism fixed by body size and prey limited, every child gift was a bet the parent would find enough food to survive; it almost never paid. The solution is to breed only when prey is demonstrably abundant (so the energy loss can be recovered) and to slash child energy from 0.4–0.7 down to 0.15–0.35, making reproduction a rare luxury affordable only when the ecosystem is booming."
// study: The galacticraptors achieved 2.6 days—the longest survival yet—through highly efficient hunting (23
// study: kills) and energy management that allowed natural death, not starvation. Yet they never bred because
// study: they actively repelled kin within 40.9 distance and sent no mating signal, making contact with a
// study: willing partner impossible despite abundant prey. A hunter that doesn't breed dies when it ages
// study: (1.6–2.9 days), leaving no offspring—the line is extinct regardless of individual success. Earlier
// study: failures confirm the pattern: zephyrs and prowlers bred desperately and starved, while luminouslynxs
// study: and galacticraptors lived longest only by avoiding breeding, which proved fatal to the species. A
// study: successful hunter must attract kin when fertile, broadcast mating willingness with signal, reach
// study: breeding energy (1.5, reachable with efficient hunting), and give enough energy to offspring that
// study: they survive to hunt and breed themselves.
function behave(me, world) {
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.15 + me.genes[2] * 0.759, keenness = me.genes[3];

  let target = null, best = Infinity, prey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.456)) continue;
    prey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  const preyHistory = me.memory.preyHistory = me.memory.preyHistory || [];
  preyHistory.push(prey);
  if (preyHistory.length > 50.8) preyHistory.shift();
  const avgPrey = preyHistory.reduce((a,b) => a+b, 0) / preyHistory.length;

  const eye = me.memory.eye = (me.memory.eye ?? 0.496) * 1.01 + 0.0106 * Math.min(1, prey / 4);
  const focus = Math.min(1.06, eye * (0.529 + keenness)) ** 1.95;

  let x = 0, y = 0;
  if (target) {
    const ahead = Math.min(best / 3.05, 10.2 + foresight * 19.5);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1;
    x += tx / d * focus;
    y += ty / d * focus;
  }

  const a = world.noise(me.x * 0.49, me.y * 0.525) * Math.PI * 4.02;
  x += Math.cos(a) * 0.413 * (1.06 - focus);
  y += Math.sin(a) * 0.395 * (0.974 - focus);

  const shouldBreed = me.fertile && me.energy > 1.5 && avgPrey > 1.8;

  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 40.9) {
      if (shouldBreed) {
        x += (o.x - me.x) / d * 0.6;
        y += (o.y - me.y) / d * 0.6;
      } else if (d < 12) {
        x -= (o.x - me.x) / d * 0.1;
        y -= (o.y - me.y) / d * 0.1;
      }
    }
  }

  const childGift = 0.3 + generosity * 0.2;

  return { x, y, eat: me.energy < appetite, mate: shouldBreed, give: childGift, signal: shouldBreed ? 0.8 : 0 };
}
