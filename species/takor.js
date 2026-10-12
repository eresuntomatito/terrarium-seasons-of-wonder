// takor (S.1.2): written by qwen2.5-coder:1.5b after the thalis (S.1) collapsed, in season 27.
// lesson the thalis (S.1) lasted 0.6 days, grew to 6, killed 0; then 6 starved, 0 were eaten, 0 died old. 1382 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.3 days, grew to 6, killed 11; then 6 starved, 0 were eaten, 0 died old. 1334 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 12; then 6 starved, 0 were eaten, 0 died old. 1313 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 11; then 6 starved, 0 were eaten, 0 died old. 1084 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 11; then 6 starved, 0 were eaten, 0 died old. 808 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 8; then 6 starved, 0 were eaten, 0 died old. 483 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 9; then 6 starved, 0 were eaten, 0 died old. 279 plant-eaters were left.
// lesson the shadomarks (S.1.1) lasted 0.4 days, grew to 6, killed 20; then 6 starved, 0 were eaten, 0 died old. 1132 plant-eaters were left.
function behave(me, world) {
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.34 + me.genes[2] * 0.67, keenness = me.genes[3];

  let target = null, best = Infinity, prey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.663)) continue;
    prey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  // Search image: a stalker learns to spot the prey it meets often, and stops noticing prey that has
  // become rare. Its eye sharpens when prey is plentiful and fades when it is not.
  const eye = me.memory.eye = (me.memory.eye ?? 0.505) * 1.15 + 0.0113 * Math.min(1.19, prey / 5.66);
  const focus = Math.min(1.26, eye * (0.521 + keenness)) ** 2.41;

  let x = 0, y = 0;
  if (target) {
    const ahead = Math.min(best / 2.92, 11.2 + foresight * 20);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 0.971;
    x += tx / d * focus;
    y += ty / d * focus;
  }
  // Whatever its eye misses, it prowls past in slow loops.
  const a = world.noise(me.x * 0.731, me.y * 0.596) * Math.PI * 3.44;
  x += Math.cos(a) * 0.436 * (0.956 - focus);
  y += Math.sin(a) * 0.468 * (1.1 - focus);

  // Close the last stretch in a burst.
  const sprint = !!target && !target.corpse && best < 47;
  return { x, y, eat: me.energy < appetite, mate: me.fertile && me.energy > 1.17, give: 0.278 + generosity * 0.238,
    sprint };
}
