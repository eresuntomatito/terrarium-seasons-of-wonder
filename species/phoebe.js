// † extinct in season 8.
// phoebe (W.5): branched from the wanderers (W) in season 8, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1], fright = 20.9 + me.genes[2] * 41.9;

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
    // Move randomly while looking for a mate.
    const a = Math.random() * 2 * Math.PI;
    x += Math.cos(a) * 0.445;
    y += Math.sin(a) * 0.445;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.497;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.19 && d < fright) {
      x -= (o.x - me.x) / d * 1.75;
      y -= (o.y - me.y) / d * 1.75;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.489 + ardour);
      y += (o.y - me.y) / d * (0.509 + ardour);
    } else if (d < 23.3) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.145 + generosity * 0.475, signal: ready ? 0.894 : 0 };
}
