// † extinct in season 47.
// ↺ returned in season 46.
// † extinct in season 46.
// ↺ returned in season 44.
// † extinct in season 44.
// ↺ returned in season 43.
// † extinct in season 43.
// ↺ returned in season 42.
// † extinct in season 42.
// galacticraptor (S.5): written by claude-haiku after the stalkers (S) collapsed, in season 41.
// lesson the shroudeds (S.2) lasted 0.4 days, grew to 4, killed 4; then 4 starved, 0 were eaten, 0 died old. 126 plant-eaters were left.
// lesson the prowlers (S.2.1) lasted 0.8 days, grew to 4, killed 5; then 4 starved, 0 were eaten, 0 died old. 184 plant-eaters were left.
// lesson the prowlers (S.2.1) lasted 1.5 days, grew to 5, killed 20; then 5 starved, 0 were eaten, 0 died old. 15 plant-eaters were left.
// lesson the stalkers (S) lasted 0.3 days, grew to 6, killed 11; then 6 starved, 0 were eaten, 0 died old. 297 plant-eaters were left.
// lesson the mystics (S.3) lasted 0.3 days, grew to 4, killed 4; then 4 starved, 0 were eaten, 0 died old. 229 plant-eaters were left.
// lesson the zephyrs (S.3.1) lasted 0.2 days, grew to 4, killed 0; then 4 starved, 0 were eaten, 0 died old. 159 plant-eaters were left.
// lesson the luminouslynxs (S.4) lasted 2.3 days, grew to 4, killed 55; then 0 starved, 0 were eaten, 4 died old. 36 plant-eaters were left.
// lesson the zephyr2s (S.4.1) lasted 0.5 days, grew to 4, killed 5; then 4 starved, 0 were eaten, 0 died old. 120 plant-eaters were left.
  You had designed them because you believed: "The last hunters died because their breeding condition required energy > 2.14 when maximum energy is 2—reproduction was impossible. Frozen at 4 individuals with no generational replacement, they hunted prey into collapse (307 → 24 in two days), then starved. The luminouslynxs survived longest by reaching natural death, suggesting their breeding worked, but the fatal pattern is clear: any threshold that cannot be reached means no population growth and inevitable ecosystem crash. The fix is setting mate to an achievable energy level (1.3), conditioning breeding on prey abundance (avgPrey > 2.3) to avoid desperate breeding during scarcity, and keeping the efficient hunting strategy with slightly more restraint so prey can replenish between generations."
// study: The luminouslynxs thrived for 2.3 days with 55 kills because they could not breed—their stable
// study: 4-individual population had no energy-draining reproduction. The zephyr2s and last hunters failed
// study: because breeding cost them 0.409–0.713 energy per child (20–35% of their 2-point maximum), forcing
// study: starvation when prey became scarce. With metabolism fixed by body size and prey limited, every child
// study: gift was a bet the parent would find enough food to survive; it almost never paid. The solution is
// study: to breed only when prey is demonstrably abundant (so the energy loss can be recovered) and to slash
// study: child energy from 0.4–0.7 down to 0.15–0.35, making reproduction a rare luxury affordable only when
// study: the ecosystem is booming.
function behave(me, world) {
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.14 + me.genes[2] * 0.795, keenness = me.genes[3];

  let target = null, best = Infinity, prey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.475)) continue;
    prey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  const preyHistory = me.memory.preyHistory = me.memory.preyHistory || [];
  preyHistory.push(prey);
  if (preyHistory.length > 50) preyHistory.shift();
  const avgPrey = preyHistory.reduce((a,b) => a+b, 0) / preyHistory.length;

  const eye = me.memory.eye = (me.memory.eye ?? 0.505) * 1.01 + 0.0102 * Math.min(1.05, prey / 3.86);
  const focus = Math.min(1.04, eye * (0.508 + keenness)) ** 2;

  let x = 0, y = 0;
  if (target) {
    const ahead = Math.min(best / 2.95, 10.4 + foresight * 20.3);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.02;
    x += tx / d * focus;
    y += ty / d * focus;
  }

  const a = world.noise(me.x * 0.482, me.y * 0.512) * Math.PI * 4.1;
  x += Math.cos(a) * 0.409 * (1.04 - focus);
  y += Math.sin(a) * 0.382 * (0.996 - focus);

  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 40.1) {
      x -= (o.x - me.x) / d * 0.494;
      y -= (o.y - me.y) / d * 0.487;
    }
  }

  const shouldBreed = me.fertile && me.energy > 1.9 && avgPrey > 3;
  const childGift = 0.15 + generosity * 0.2;

  return { x, y, eat: me.energy < appetite, mate: shouldBreed, give: childGift };
}
