// grafton (W.14): branched from the wanderers (W) in season 28, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1], fright = 17.8 + me.genes[2] * 36.2;

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
    // Navigate towards a random direction, avoiding obstacles.
    while (true) {
      x = Math.random() * world.width - world.width / 2;
      y = Math.random() * world.height - world.height / 2;
      const inObstacle = world.others.some(o => Math.hypot(o.x - x, o.y - y) < fright * 0.707);
      if (!inObstacle) break;
    }
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.265;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.14 && d < fright) {
      x -= (o.x - me.x) / d * 2.11;
      y -= (o.y - me.y) / d * 1.51;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.406 + ardour);
      y += (o.y - me.y) / d * (0.43 + ardour);
    } else if (d < 15.3) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  // Bolt when something that could eat it is close.
  const inObstacle = world.others.some(o => Math.hypot(o.x - me.x, o.y - me.y) < fright * 0.707);
  if (inObstacle) {
    x += (world.noise(me.x, me.y) * Math.PI * 2.96) / 1.78 * 1.26 * 0.87;
    y += (world.noise(me.x, me.y) * Math.PI * 2.96) / 1.78 * 1.40 * 0.87;
  }

  return { x, y, mate: ready, give: 0.156 + generosity * 0.407, signal: ready ? 0.704 : 0,
    // Bolt when something that could eat it is close.
    sprint: world.others.some(o => !o.kin && o.size >= me.size * 1.12 && Math.hypot(o.x - me.x, o.y - me.y) < fright * 0.707) };
}
