// featherfox (W.12): branched from the wanderers (W) in season 24, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1], fright = 18.3 + me.genes[2] * 36.4;

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
    // Seek the sun.
    x += (world.width - me.x) * 0.01;
    y += (world.height - me.y) * 0.01;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.288;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.11 && d < fright) {
      x -= (o.x - me.x) / d * 2.01;
      y -= (o.y - me.y) / d * 1.55;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.426 + ardour);
      y += (o.y - me.y) / d * (0.449 + ardour);
    } else if (d < 14.5) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.25 + generosity * 0.395, signal: ready ? 0.8 : 0,
    // Fly when something that could eat it is close.
    sprint: world.others.some(o => !o.kin && o.size >= me.size * 1.1 && Math.hypot(o.x - me.x, o.y - me.y) < fright * 0.653) };
}
