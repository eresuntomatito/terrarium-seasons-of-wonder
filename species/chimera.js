// † extinct in season 4.
// chimera (W.2): branched from the wanderers (W) in season 4, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1], fright = 20.2 + me.genes[2] * 41;

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
    // Move randomly.
    x += Math.random() * 2 - 1;
    y += Math.random() * 2 - 1;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.846;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.18 && d < fright) {
      x -= (o.x - me.x) / d * 2.16;
      y -= (o.y - me.y) / d * 1.89;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.483 + ardour);
      y += (o.y - me.y) / d * (0.516 + ardour);
    } else if (d < 15.1) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.187 + generosity * 0.391, signal: ready ? 0.994 : 0 };
}
