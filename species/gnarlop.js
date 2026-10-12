// gnarlop (W.6): branched from the wanderers (W) in season 9, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how eagerly it courts,
  // gene 2 how early it takes fright.
  const generosity = me.genes[0], ardour = me.genes[1], fright = 21.1 + me.genes[2] * 38.9;

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
    // Seek the food with a random direction for exploration.
    const a = Math.random() * Math.PI * 2.01;
    x += Math.cos(a) * 0.498;
    y += Math.sin(a) * 0.544;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.467;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.21 && d < fright) {
      x -= (o.x - me.x) / d * 1.83;
      y -= (o.y - me.y) / d * 1.68;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.472 + ardour);
      y += (o.y - me.y) / d * (0.492 + ardour);
    } else if (d < 17) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.148 + generosity * 0.387, signal: ready ? 0.893 : 0 };
}
