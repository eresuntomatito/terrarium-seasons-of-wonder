// ↺ returned in season 124.
// † extinct in season 123.
// ↺ returned in season 122.
// † extinct in season 122.
// rumi (W.1.10.2.1.1): branched from the peckards (W.1.10.2.1) in season 121, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1],
    fright = 17.9 + me.genes[2] * 21.2;

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
    // Explore the noise field in a more aggressive manner.
    x += Math.random() * 1.27 - 0.561;
    y += Math.random() * 1.52 - 0.751;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner;
  // otherwise ATTRACT to kin for clustering (inverted from parent's repulsion).
  const ready = me.fertile && me.energy > 0.439;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.26 && d < fright) {
      x -= (o.x - me.x) / d * 1.85;
      y -= (o.y - me.y) / d * 1.74;
    } else if (o.kin) {
      // Kin clustering: attract to all kin, stronger pull to willing mates.
      if (ready && o.willing) {
        x += (o.x - me.x) / d * (0.395 + ardour);
        y += (o.y - me.y) / d * (0.182 + ardour);
      } else {
        // More aggressive attraction to other kin forms protective group.
        x += (o.x - me.x) / d * 0.431;
        y += (o.y - me.y) / d * 0.407;
      }
    } else if (d < 8.72) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  // Give a bit of energy to children if fertile.
  if (me.fertile) {
    me.energy += me.genes[3];
  }

  // Display a darker hue if fertile.
  const hue = me.fertile ? me.hue - 5.61 : me.hue;

  return { x, y, mate: ready, give: 0.168 + generosity * 0.334, signal: ready ? 0.382 : 0, hue };
}
