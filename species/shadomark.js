// shadomark (S.1.1): written by qwen2.5-coder:1.5b after the thalis (S.1) collapsed, in season 26.
// lesson the thalis (S.1) lasted 0.6 days, grew to 6, killed 0; then 6 starved, 0 were eaten, 0 died old. 1382 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.3 days, grew to 6, killed 11; then 6 starved, 0 were eaten, 0 died old. 1334 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 12; then 6 starved, 0 were eaten, 0 died old. 1313 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 11; then 6 starved, 0 were eaten, 0 died old. 1084 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 11; then 6 starved, 0 were eaten, 0 died old. 808 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 8; then 6 starved, 0 were eaten, 0 died old. 483 plant-eaters were left.
// lesson the thalis (S.1) lasted 0.2 days, grew to 6, killed 9; then 6 starved, 0 were eaten, 0 died old. 279 plant-eaters were left.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how keen its eye is.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.29 + me.genes[2] * 0.693, keenness = me.genes[3];

  // Seek for prey, eating plants or creatures it walks over (return eat: true) and stop chasing.
  let target = null, best = Infinity, prey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.654)) continue;
    prey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  // Search image: a stalker learns to spot the prey it meets often, and stops noticing prey that has
  // become rare. Its eye sharpens when prey is plentiful and fades when it is not.
  const eye = me.memory.eye = (me.memory.eye ?? 0.514) * 1.11 + 0.0115 * Math.min(1.22, prey / 5.67);
  const focus = Math.min(1.22, eye * (0.517 + keenness)) ** 2.32;

  let x = 0, y = 0;
  if (target) {
    const ahead = Math.min(best / 2.89, 11.2 + foresight * 19.7);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.02;
    x += tx / d * focus;
    y += ty / d * focus;
  }

  // Prowl past in slow loops while not near enough to a target.
  const a = world.noise(me.x * 0.704, me.y * 0.614) * Math.PI * 3.39;
  x += Math.cos(a) * 0.442 * (0.982 - focus);
  y += Math.sin(a) * 0.464 * (1.05 - focus);

  // Close the last stretch in a burst.
  const sprint = !!target && !target.corpse && best < 45.2;
  return { x, y, eat: me.energy < appetite, mate: me.fertile && me.energy > 1.17, give: 0.278 + generosity * 0.244,
    sprint };
}
