// zephyr2 (S.4.1): written by claude-haiku after the luminouslynxs (S.4) collapsed, in season 39.
// lesson the chromis (S.1.1) lasted 0.3 days, grew to 4, killed 4; then 4 starved, 0 were eaten, 0 died old. 236 plant-eaters were left.
// lesson the shroudeds (S.2) lasted 0.4 days, grew to 4, killed 4; then 4 starved, 0 were eaten, 0 died old. 126 plant-eaters were left.
// lesson the prowlers (S.2.1) lasted 0.8 days, grew to 4, killed 5; then 4 starved, 0 were eaten, 0 died old. 184 plant-eaters were left.
// lesson the prowlers (S.2.1) lasted 1.5 days, grew to 5, killed 20; then 5 starved, 0 were eaten, 0 died old. 15 plant-eaters were left.
// lesson the stalkers (S) lasted 0.3 days, grew to 6, killed 11; then 6 starved, 0 were eaten, 0 died old. 297 plant-eaters were left.
// lesson the mystics (S.3) lasted 0.3 days, grew to 4, killed 4; then 4 starved, 0 were eaten, 0 died old. 229 plant-eaters were left.
// lesson the zephyrs (S.3.1) lasted 0.2 days, grew to 4, killed 0; then 4 starved, 0 were eaten, 0 died old. 159 plant-eaters were left.
// lesson the luminouslynxs (S.4) lasted 2.3 days, grew to 4, killed 55; then 0 starved, 0 were eaten, 4 died old. 36 plant-eaters were left.
// study: The last hunters died because their breeding condition required energy > 2.14 when maximum energy is
// study: 2—reproduction was impossible. Frozen at 4 individuals with no generational replacement, they hunted
// study: prey into collapse (307 → 24 in two days), then starved. The luminouslynxs survived longest by
// study: reaching natural death, suggesting their breeding worked, but the fatal pattern is clear: any
// study: threshold that cannot be reached means no population growth and inevitable ecosystem crash. The fix
// study: is setting mate to an achievable energy level (1.3), conditioning breeding on prey abundance
// study: (avgPrey > 2.3) to avoid desperate breeding during scarcity, and keeping the efficient hunting
// study: strategy with slightly more restraint so prey can replenish between generations.
function behave(me, world) {
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 0.9 + me.genes[2] * 0.8, keenness = me.genes[3];

  let target = null, best = Infinity, prey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.5)) continue;
    prey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  const eye = me.memory.eye = (me.memory.eye ?? 0.5) * 1.018 + 0.011 * Math.min(1.1, prey / 3.5);
  const focus = Math.min(1.05, eye * (0.515 + keenness * 0.42)) ** 2;

  me.memory.preyHistory = me.memory.preyHistory ?? [];
  me.memory.preyHistory.push(prey);
  if (me.memory.preyHistory.length > 20) me.memory.preyHistory.shift();
  const avgPrey = me.memory.preyHistory.reduce((a, b) => a + b, 0) / me.memory.preyHistory.length;

  let x = 0, y = 0;
  if (target) {
    const ahead = Math.min(best / 2.9, 9.5 + foresight * 19);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1;
    x += tx / d * focus;
    y += ty / d * focus;
  }

  const a = world.noise(me.x * 0.475, me.y * 0.527) * Math.PI * 4;
  x += Math.cos(a) * 0.42 * (1 - focus);
  y += Math.sin(a) * 0.37 * (1 - focus);

  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 39) {
      x -= (o.x - me.x) / d * 0.48;
      y -= (o.y - me.y) / d * 0.48;
    }
  }

  return { x, y, eat: me.energy < appetite, mate: me.fertile && me.energy > 1.3 && avgPrey > 2.3, give: 0.42 + generosity * 0.32 };
}
