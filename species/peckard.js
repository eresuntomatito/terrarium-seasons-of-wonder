// peckard (W.1.10.2.1): branched from the galaxys (W.1.10.2) in season 116, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1],
    fright = 18.7 + me.genes[2] * 20.8;

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
    // Random wander away from the noise field.
    x += Math.random() * 1.25 - 0.625;
    y += Math.random() * 1.55 - 0.745;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner;
  // otherwise ATTRACT to kin for clustering (inverted from parent's repulsion).
  const ready = me.fertile && me.energy > 0.439;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.2 && d < fright) {
      x -= (o.x - me.x) / d * 1.71;
      y -= (o.y - me.y) / d * 1.72;
    } else if (o.kin) {
      // Kin clustering: attract to all kin, stronger pull to willing mates.
      if (ready && o.willing) {
        x += (o.x - me.x) / d * (0.434 + ardour);
        y += (o.y - me.y) / d * (0.196 + ardour);
      } else {
        // Mild attraction to other kin forms protective group.
        x += (o.x - me.x) / d * 0.275;
        y += (o.y - me.y) / d * 0.328;
      }
    } else if (d < 7.75) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  // Give a bit of energy to children if fertile.
  if (me.fertile) {
    me.energy += me.genes[3];
  }

  // Display a slightly darker hue if fertile.
  const hue = me.fertile ? me.hue - 5 : me.hue;

  return { x, y, mate: ready, give: 0.111 + generosity * 0.311, signal: ready ? 0.298 : 0, hue };
}
