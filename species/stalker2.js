// ↺ returned in season 36.
// † extinct in season 36.
// ↺ returned in season 36.
// † extinct in season 36.
// ↺ returned in season 36.
// † extinct in season 36.
// ↺ returned in season 36.
// † extinct in season 36.
// ↺ returned in season 35.
// † extinct in season 35.
// ↺ returned in season 35.
// † extinct in season 35.
// ↺ returned in season 35.
// † extinct in season 35.
// ↺ returned in season 35.
// † extinct in season 35.
// ↺ returned in season 35.
// † extinct in season 35.
// ↺ returned in season 35.
// † extinct in season 35.
// stalker2 (S.3): written by qwen2.5-coder:1.5b after the stalkers (S) collapsed, in season 35.
// lesson the wanderlusts (S.2) lasted 0.3 days, grew to 2, killed 0; then 2 starved, 0 were eaten, 0 died old. 510 plant-eaters were left.
// lesson the zephyr4s (S.2.1) lasted 0.4 days, grew to 6, killed 17; then 6 starved, 0 were eaten, 0 died old. 966 plant-eaters were left.
// lesson the stalkers (S) lasted 78.9 days, grew to 50, killed 5365; then 37 starved, 12 were eaten, 578 died old. 791 plant-eaters were left.
// lesson the zephyr4s (S.2.1) lasted 0.5 days, grew to 6, killed 20; then 6 starved, 0 were eaten, 0 died old. 607 plant-eaters were left.
// lesson the zephyr4s (S.2.1) lasted 0.5 days, grew to 6, killed 16; then 6 starved, 0 were eaten, 0 died old. 427 plant-eaters were left.
// lesson the rendriles (S.2.1.1) lasted 0.5 days, grew to 6, killed 6; then 6 starved, 0 were eaten, 0 died old. 437 plant-eaters were left.
// lesson the rendriles (S.2.1.1) lasted 2 days, grew to 6, killed 35; then 5 starved, 0 were eaten, 1 died old. 1285 plant-eaters were left.
// lesson the rendriles (S.2.1.1) lasted 0.6 days, grew to 6, killed 15; then 6 starved, 0 were eaten, 0 died old. 1149 plant-eaters were left.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how keen its eye is.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.19 + me.genes[2] * 0.638, keenness = me.genes[3];

  // Pursue the nearest creature it could eat, aiming where it is going to be. Its own kind only when starving.
  let target = null, best = Infinity, prey = 0;
  for (const f of world.food) {
    if (f.plant || (f.kin && me.energy > 0.596)) continue;
    prey++;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  // Search image: a stalker learns to spot the prey it meets often, and stops noticing prey that has
  // become rare. Its eye sharpens when prey is plentiful and fades when it is not.
  const eye = me.memory.eye = (me.memory.eye ?? 0.599) * 1.1 + 0.00907 * Math.min(1.15, prey / 5.32);
  const focus = Math.min(1.52, eye * (0.534 + keenness)) ** 2.28;

  let x = 0, y = 0;
  if (target) {
    const ahead = Math.min(best / 2.97, 12.5 + foresight * 21);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 0.93;
    x += tx / d * focus;
    y += ty / d * focus;
  }

  // Stalkers keep away from their own kind, so they mostly breed alone.
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 35.7) {
      x -= (o.x - me.x) / d * 0.665;
      y -= (o.y - me.y) / d * 0.53;
    }
  }

  // The stalker now learns to only eat plants it walks over, and stop chasing if prey is scarce.
  if (!target) {
    // Search for plants it can eat.
    let plantFound = false;
    for (const f of world.food) {
      if (f.plant && me.energy > appetite) {
        plantFound = true;
        x = f.x;
        y = f.y;
        break;
      }
    }
    if (!plantFound) {
      return { x, y, eat: false, mate: false, give: 0.269 + generosity * 0.222 };
    }
  }

  // Close the last stretch in a burst.
  return { x, y, eat: true, mate: me.fertile && me.energy > 0.982, give: 0.269 + generosity * 0.222,
    sprint: !!target && !target.corpse && best < 39.6 };
}
