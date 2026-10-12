// fluxio (W.1): branched from the wanderers (W) in season 3, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how eagerly it courts,
  // gene 2 how early it takes fright.
  const generosity = me.genes[0], ardour = me.genes[1], fright = 20.1 + me.genes[2] * 38.5;

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
    // Explore the terrarium randomly.
    x += Math.random() * 2 - 1;
    y += Math.random() * 2 - 1;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.882;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.19 && d < fright) {
      x -= (o.x - me.x) / d * 2.01;
      y -= (o.y - me.y) / d * 2.04;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.474 + ardour);
      y += (o.y - me.y) / d * (0.5 + ardour);
    } else if (d < 14.9) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.199 + generosity * 0.403, signal: ready ? 0.998 : 0 };
}
