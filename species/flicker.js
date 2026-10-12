// † extinct in season 16.
// flicker (W.8): branched from the wanderers (W) in season 16, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1], fright = 22.3 + me.genes[2] * 41;

  // Find the closest food.
  let target = null, best = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  let x = 0, y = 0;
  if (target) {
    x += (target.x - me.x) / best;
    y += (target.y - me.y) / best;
  } else {
    // Seek a different direction by turning around a little bit to avoid getting stuck.
    const a = Math.atan2(Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI) + Math.PI * 0.5;
    x += Math.cos(a) * 0.447;
    y += Math.sin(a) * 0.574;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.357;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.17 && d < fright) {
      x -= (o.x - me.x) / d * 2;
      y -= (o.y - me.y) / d * 1.76;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.492 + ardour);
      y += (o.y - me.y) / d * (0.451 + ardour);
    } else if (d < 18.5) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.138 + generosity * 0.43, signal: ready ? 0.79 : 0,
    // Charge at something big enough to eat it and bite.
    sprint: world.others.some(o => !o.kin && o.size >= me.size * 1.23 && Math.hypot(o.x - me.x, o.y - me.y) < fright * 0.608) };
}
