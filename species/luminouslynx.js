// luminouslynx (S.4): written by claude-haiku after the stalkers (S) collapsed, in season 38.
// lesson the chromis (S.1.1) lasted 0.5 days, grew to 4, killed 9; then 4 starved, 0 were eaten, 0 died old. 305 plant-eaters were left.
// lesson the chromis (S.1.1) lasted 0.3 days, grew to 4, killed 4; then 4 starved, 0 were eaten, 0 died old. 236 plant-eaters were left.
// lesson the shroudeds (S.2) lasted 0.4 days, grew to 4, killed 4; then 4 starved, 0 were eaten, 0 died old. 126 plant-eaters were left.
// lesson the prowlers (S.2.1) lasted 0.8 days, grew to 4, killed 5; then 4 starved, 0 were eaten, 0 died old. 184 plant-eaters were left.
// lesson the prowlers (S.2.1) lasted 1.5 days, grew to 5, killed 20; then 5 starved, 0 were eaten, 0 died old. 15 plant-eaters were left.
// lesson the stalkers (S) lasted 0.3 days, grew to 6, killed 11; then 6 starved, 0 were eaten, 0 died old. 297 plant-eaters were left.
// lesson the mystics (S.3) lasted 0.3 days, grew to 4, killed 4; then 4 starved, 0 were eaten, 0 died old. 229 plant-eaters were left.
// lesson the zephyrs (S.3.1) lasted 0.2 days, grew to 4, killed 0; then 4 starved, 0 were eaten, 0 died old. 159 plant-eaters were left.
// study: Every previous stalker generation died of starvation despite killing prey efficiently. The pattern
// study: is clear: hunters breed rapidly when well-fed, quickly exhaust local prey populations, then starve
// study: en masse. The last generation killed 11 prey in 0.3 days but all 6 died within the same
// study: timeframe—their high metabolism and rapid reproduction created an unsustainable population crash.
// study: The flaw is not in the hunting algorithm (which works well) but in breeding strategy: hunters
// study: reproduce based on a fixed energy threshold without considering whether prey is abundant enough to
// study: sustain a larger population. A successful stalker must breed conservatively, only when prey
// study: abundance can support offspring long-term.
function behave(me, world) {
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.14 + me.genes[2] * 0.795, keenness = me.genes[3];

  let target = null, best = Infinity, prey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.475)) continue;
    prey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  const eye = me.memory.eye = (me.memory.eye ?? 0.505) * 1.01 + 0.0102 * Math.min(1.05, prey / 3.86);
  const focus = Math.min(1.04, eye * (0.508 + keenness)) ** 2;

  // Track prey abundance over time to make breeding decisions.
  me.memory.preyHistory = me.memory.preyHistory ?? [];
  me.memory.preyHistory.push(prey);
  if (me.memory.preyHistory.length > 20) me.memory.preyHistory.shift();
  const avgPrey = me.memory.preyHistory.reduce((a, b) => a + b, 0) / me.memory.preyHistory.length;

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

  return { x, y, eat: me.energy < appetite, mate: me.fertile && me.energy > 2.1 && avgPrey > 2.5, give: 0.409 + generosity * 0.304 };
}
