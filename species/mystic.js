// † extinct in season 36.
// mystic (S.3): written by claude-haiku after the stalkers (S) collapsed, in season 35.
// lesson the stalkzoes (S.1) lasted 0.8 days, grew to 4, killed 8; then 4 starved, 0 were eaten, 0 died old. 221 plant-eaters were left.
// lesson the stalkzoes (S.1) lasted 0.7 days, grew to 5, killed 16; then 6 starved, 0 were eaten, 0 died old. 77 plant-eaters were left.
// lesson the chromis (S.1.1) lasted 0.5 days, grew to 4, killed 9; then 4 starved, 0 were eaten, 0 died old. 305 plant-eaters were left.
// lesson the chromis (S.1.1) lasted 0.3 days, grew to 4, killed 4; then 4 starved, 0 were eaten, 0 died old. 236 plant-eaters were left.
// lesson the shroudeds (S.2) lasted 0.4 days, grew to 4, killed 4; then 4 starved, 0 were eaten, 0 died old. 126 plant-eaters were left.
// lesson the prowlers (S.2.1) lasted 0.8 days, grew to 4, killed 5; then 4 starved, 0 were eaten, 0 died old. 184 plant-eaters were left.
// lesson the prowlers (S.2.1) lasted 1.5 days, grew to 5, killed 20; then 5 starved, 0 were eaten, 0 died old. 15 plant-eaters were left.
// lesson the stalkers (S) lasted 0.3 days, grew to 6, killed 11; then 6 starved, 0 were eaten, 0 died old. 297 plant-eaters were left.
function behave(me, world) {
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.14 + me.genes[2] * 0.795, keenness = me.genes[3];

  // Calculate current speed
  const mySpeed = Math.hypot(me.vx, me.vy);
  
  // Only pursue prey that are moving slower than me
  let target = null, best = Infinity, slowerPrey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.475)) continue;
    
    const preySpeed = Math.hypot(f.vx, f.vy);
    // Only chase prey moving slower than this hunter
    if (preySpeed >= mySpeed) continue;
    
    slowerPrey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  // Eye adapts to availability of catchable prey
  const eye = me.memory.eye = (me.memory.eye ?? 0.505) * 1.01 + 0.0102 * Math.min(1.05, slowerPrey / 2.8);
  const focus = Math.min(0.82, eye * (0.508 + keenness)) ** 2;

  let x = 0, y = 0;
  
  if (target) {
    // Conservative pursuit to save energy
    const ahead = Math.min(best / 4.2, 7.8 + foresight * 13.5);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.02;
    x += tx / d * focus * 0.58;
    y += ty / d * focus * 0.58;
  }
  
  // Gentle wandering to conserve energy when not pursuing
  const a = world.noise(me.x * 0.482, me.y * 0.512) * Math.PI * 3.7;
  x += Math.cos(a) * 0.37 * (1.01 - focus * 0.62);
  y += Math.sin(a) * 0.35 * (1.01 - focus * 0.62);

  // Lower repulsion from kin to reduce wasted movement
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 40.1) {
      x -= (o.x - me.x) / d * 0.33;
      y -= (o.y - me.y) / d * 0.33;
    }
  }

  return { x, y, eat: me.energy < appetite, mate: me.fertile && me.energy > 1.35, give: 0.409 + generosity * 0.304 };
}
