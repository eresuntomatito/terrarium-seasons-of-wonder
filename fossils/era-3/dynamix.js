// † extinct in season 104.
// dynamix (S.5.5.7.1.1.1): branched from the majesticfoxs (S.5.5.7.1.1) in season 89, written by qwen2.5-coder:1.5b.
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
    const leadDist = Math.min(bestDist / 3.35, 7.13 + huntFocus * 14.3);
    const tx = target.x + target.vx * leadDist - me.x;
    const ty = target.y + target.vy * leadDist - me.y;
    const d = Math.hypot(tx, ty) || 1.13;
    x += tx / d * (0.577 + huntFocus * 0.424);
    y += ty / d * (0.527 + huntFocus * 0.488);
  }

  // Territorial behavior: repel kin, but attract willing mates when fertile
  const readyToBreed = me.fertile && me.energy > 1.26;

  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;

    if (readyToBreed && o.willing) {
      // Navigate toward willing mates (mating is free energy-wise)
      const strength = 0.573 + seekEagerness * 0.39;
      x += (o.x - me.x) / d * strength;
      y += (o.y - me.y) / d * strength;
    } else if (d < 38.3) {
      // Repel kin to maintain territory and keep prey accessible
      const repulsion = readyToBreed ? 0.294 : 0.582;
      x -= (o.x - me.x) / d * repulsion;
      y -= (o.y - me.y) / d * repulsion;
    }
  }

  // Wandering with perlin noise when no prey visible
  if (!target) {
    const angle = world.noise(me.x * 0.474, me.y * 0.442) * Math.PI * 4.09;
    x += Math.cos(angle) * (0.205 + roamTendency * 0.262);
    y += Math.sin(angle) * (0.218 + roamTendency * 0.278);
  }

  // Breeding decision
  const wantToBreed = me.fertile && me.energy > 0.754;

  return {
    x,
    y,
    mate: wantToBreed,
    give: 0.482 + generosity * 0.443, // Gift 0.43 to 0.70 energy to offspring
    signal: wantToBreed ? 0.708 : 0
  };
}
