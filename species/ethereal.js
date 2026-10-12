// ethereal (W.1.10.1): branched from the globulus (W.1.10) in season 108, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1],
    fright = 19.3 + me.genes[2] * 25.4;

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
    // Wander the arena in a seemingly random direction.
    const a = Math.random() * Math.PI * 2;
    x += Math.cos(a) * 0.559 + Math.random() * 0.209;
    y += Math.sin(a) * 0.559 + Math.random() * 0.209;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner;
  // otherwise ATTRACT to kin for clustering (inverted from parent's repulsion).
  const ready = me.fertile && me.energy > 0.486;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.29 && d < fright) {
      x -= (o.x - me.x) / d * 1.52;
      y -= (o.y - me.y) / d * 1.99;
    } else if (o.kin) {
      // Kin clustering: attract to all kin, stronger pull to willing mates.
      if (ready && o.willing) {
        x += (o.x - me.x) / d * (0.462 + ardour);
        y += (o.y - me.y) / d * (0.19 + ardour);
      } else {
        // Mild attraction to other kin forms protective group.
        x += (o.x - me.x) / d * 0.245;
        y += (o.y - me.y) / d * 0.305;
      }
    } else if (d < 7.92) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  // Signal to the world and be generous towards other creatures.
  return { x, y, mate: ready, give: 0.0934 + generosity * 0.324, signal: 0.897, eat: target !== null };
}
