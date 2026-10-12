// † extinct in season 89.
// majesticfox (S.5.5.7.1.1): branched from the luminouslyns (S.5.5.7.1) in season 87, written by qwen2.5-coder:1.5b.
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
    const leadDist = Math.min(bestDist / 3.37, 7.41 + huntFocus * 14.7);
    const tx = target.x + target.vx * leadDist - me.x;
    const ty = target.y + target.vy * leadDist - me.y;
    const d = Math.hypot(tx, ty) || 1.12;
    x += tx / d * (0.564 + huntFocus * 0.411);
    y += ty / d * (0.534 + huntFocus * 0.49);
  }

  // Territorial behavior: repel kin, but attract willing mates when fertile
  const readyToBreed = me.fertile && me.energy > 1.25;

  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;

    if (readyToBreed && o.willing) {
      // Navigate toward willing mates (mating is free energy-wise)
      const strength = 0.58 + seekEagerness * 0.409;
      x += (o.x - me.x) / d * strength;
      y += (o.y - me.y) / d * strength;
    } else if (d < 40) {
      // Repel kin to maintain territory and keep prey accessible
      const repulsion = readyToBreed ? 0.299 : 0.623;
      x -= (o.x - me.x) / d * repulsion;
      y -= (o.y - me.y) / d * repulsion;
    }
  }

  // Wandering with perlin noise when no prey visible
  if (!target) {
    const angle = world.noise(me.x * 0.492, me.y * 0.457) * Math.PI * 4.1;
    x += Math.cos(angle) * (0.207 + roamTendency * 0.263);
    y += Math.sin(angle) * (0.225 + roamTendency * 0.279);
  }

  // Breeding decision
  const wantToBreed = me.fertile && me.energy > 0.853;

  return {
    x,
    y,
    mate: wantToBreed,
    give: 0.445 + generosity * 0.453, // Gift 0.43 to 0.70 energy to offspring
    signal: wantToBreed ? 0.735 : 0
  };
}
