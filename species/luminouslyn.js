// luminouslyn (S.5.5.7.1): branched from the chillus (S.5.5.7) in season 85, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  const generosity = me.genes[0],
    huntFocus = me.genes[1],
    seekEagerness = me.genes[2],
    roamTendency = me.genes[3];

  let x = 0, y = 0;

  // Hunting: target non-kin prey with prediction
  let target = null, bestDist = Infinity;
  for (const f of world.food) {
    if (f.plant || f.kin) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < bestDist) { bestDist = d; target = f; }
  }

  if (target) {
    // Lead prey: predict intercept point
    const leadDist = Math.min(bestDist / 3.43, 7.64 + huntFocus * 14.6);
    const tx = target.x + target.vx * leadDist - me.x;
    const ty = target.y + target.vy * leadDist - me.y;
    const d = Math.hypot(tx, ty) || 1.14;
    x += tx / d * (0.558 + huntFocus * 0.4);
    y += ty / d * (0.519 + huntFocus * 0.478);
  }

  // Territorial behavior: repel kin, but attract willing mates when fertile
  const readyToBreed = me.fertile && me.energy > 1.23;

  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;

    if (readyToBreed && o.willing) {
      // Navigate toward willing mates (mating is free energy-wise)
      const strength = 0.572 + seekEagerness * 0.383;
      x += (o.x - me.x) / d * strength;
      y += (o.y - me.y) / d * strength;
    } else if (d < 45.5) {
      // Repel kin to maintain territory and keep prey accessible
      const repulsion = readyToBreed ? 0.31 : 0.674;
      x -= (o.x - me.x) / d * repulsion;
      y -= (o.y - me.y) / d * repulsion;
    }
  }

  // Wandering with perlin noise when no prey visible
  if (!target) {
    const angle = world.noise(me.x * 0.495, me.y * 0.463) * Math.PI * 3.93;
    x += Math.cos(angle) * (0.197 + roamTendency * 0.256);
    y += Math.sin(angle) * (0.213 + roamTendency * 0.293);
  }

  // Breeding decision
  const wantToBreed = me.fertile && me.energy > 0.892;

  return {
    x,
    y,
    mate: wantToBreed,
    give: 0.382 + generosity * 0.352, // Gift 0.33 to 0.60 energy to offspring
    signal: wantToBreed ? 0.643 : 0
  };
}
