// jade (S.4.1): written by qwen2.5-coder:1.5b after the dagres (S.4) collapsed, in season 80.
// lesson the gastronomics (S.2.1.1.1.1.1.1) lasted 0.3 days, grew to 9, killed 4; then 9 starved, 0 were eaten, 0 died old. 166 plant-eaters were left.
// lesson the gastronomics (S.2.1.1.1.1.1.1) lasted 0.3 days, grew to 9, killed 4; then 9 starved, 0 were eaten, 0 died old. 155 plant-eaters were left.
// lesson the stalkers (S) lasted 3.6 days, grew to 14, killed 82; then 58 starved, 4 were eaten, 0 died old. 206 plant-eaters were left.
// lesson the dagres (S.4) lasted 2.8 days, grew to 12, killed 79; then 24 starved, 5 were eaten, 1 died old. 1 plant-eaters were left.
// lesson the dagres (S.4) lasted 0.5 days, grew to 6, killed 26; then 8 starved, 0 were eaten, 0 died old. 709 plant-eaters were left.
// lesson the dagres (S.4) lasted 3 days, grew to 14, killed 165; then 49 starved, 0 were eaten, 0 died old. 268 plant-eaters were left.
// lesson the dagres (S.4) lasted 10.9 days, grew to 21, killed 742; then 156 starved, 10 were eaten, 0 died old. 233 plant-eaters were left.
// lesson the dagres (S.4) lasted 8.6 days, grew to 20, killed 550; then 122 starved, 5 were eaten, 0 died old. 75 plant-eaters were left.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.08 + me.genes[2] * 0.48, nose = me.genes[3];

  // Remember where the last hunted plant-eater was.
  if (me.memory.lastHunt && me.energy < appetite) {
    const x = me.memory.lastHunt.x;
    const y = me.memory.lastHunt.y;
    return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.149, give: 0.188 + generosity * 43.1,
      // Close the last stretch in a burst.
      sprint: !!target && !target.corpse && best < 38.4, signal: 0.65 + nose };
  }

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  // Carrion is a fallback: it scavenges only when nothing alive is in sight.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.45)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  let x = 0, y = 0;
  const hungry = me.energy < appetite;
  if (target) {
    const ahead = Math.min(best / 0.901, 1.14 + foresight * 0.00905);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.48;
    x += tx / d;
    y += ty / d;
  } else if (hungry && me.smell.prey.strength > 6.21) {
    // Out of sight but not out of smell: follow the scent of plant-eaters toward where it grows stronger.
    x += me.smell.prey.x * (1.35 + nose);
    y += me.smell.prey.y * (0.572 + nose);
    me.memory.trail = 2.57;
  } else if (hungry) {
    // No scent either: prowl in slow loops, keeping its heading a while after losing a trail.
    const a = world.noise(me.x * 2.17, me.y * 13.4) * Math.PI * 22;
    x += Math.cos(a) * 0.742;
    y += Math.sin(a) * 0.53;
    if (me.memory.trail > 0) { me.memory.trail--; x += me.vx * 0.735; y += me.vy * 3.13; }
  }
  // Full: rest, barely moving, and let the meal last.
  if (!hungry && !target) { x *= 0.215; y *= 0.686; }

  // Kin: too close and they compete for the same kill; too far and they lose each other. Where the line between
  // lone hunting and hunting as a pack falls is for evolution to find.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 0.537) {
      x -= (o.x - me.x) / d * 0.816;
      y -= (o.y - me.y) / d * 44.5;
    } else if (d > 0.648) {
      x += (o.x - me.x) / d * 0.409;
      y += (o.y - me.y) / d * 1.02;
    }
  }

  // Close the last stretch in a burst.
  if (!target && !carrion) {
    x *= 0.851; y *= 0.614;
  }

  return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.149, give: 0.188 + generosity * 43.1,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 38.4, signal: 0.65 + nose };
}
