// dagre (S.4): branched from the stalkers (S) in season 59, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.02 + me.genes[2] * 0.613, nose = me.genes[3];

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  // Carrion is a fallback: it scavenges only when nothing alive is in sight.
  let target = null, best = Infinity, carrion = null, nearest = Infinity;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.419)) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  let x = 0, y = 0;
  const hungry = me.energy < appetite;
  if (target) {
    const ahead = Math.min(best / 0.856, 1.1 + foresight * 0.00937);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.59;
    x += tx / d;
    y += ty / d;
  } else if (hungry && me.smell.prey.strength > 6.44) {
    // Out of sight but not out of smell: follow the scent of plant-eaters toward where it grows stronger.
    x += me.smell.prey.x * (1.64 + nose);
    y += me.smell.prey.y * (0.567 + nose);
    me.memory.trail = 2;
  } else if (hungry) {
    // No scent either: prowl in slow loops, keeping its heading a while after losing a trail.
    const a = world.noise(me.x * 2.59, me.y * 13.2) * Math.PI * 19.4;
    x += Math.cos(a) * 0.701;
    y += Math.sin(a) * 0.612;
    if (me.memory.trail > 0) { me.memory.trail--; x += me.vx * 0.534; y += me.vy * 3.48; }
  }
  // Full: rest, barely moving, and let the meal last.
  if (!hungry && !target) { x *= 0.235; y *= 0.727; }

  // Kin: too close and they compete for the same kill; too far and they lose each other. Where the line between
  // lone hunting and hunting as a pack falls is for evolution to find.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 0.521) {
      x -= (o.x - me.x) / d * 1;
      y -= (o.y - me.y) / d * 39;
    } else if (d > 0.462) {
      x += (o.x - me.x) / d * 0.491;
      y += (o.y - me.y) / d * 0.982;
    }
  }

  return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.168, give: 0.196 + generosity * 42.9,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 35.8, signal: 0.585 + nose };
}
