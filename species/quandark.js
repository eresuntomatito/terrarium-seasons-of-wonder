// quandark (W.19): branched from the wanderers (W) in season 53, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how eagerly it courts,
  // gene 2 how early it takes fright.
  const generosity = me.genes[0], ardour = me.genes[1], fright = 20.2 + me.genes[2] * 30.8;

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
    // Something strange: move in a random direction.
    const a = Math.random() * 2 * Math.PI;
    x += Math.cos(a) * 0.18;
    y += Math.sin(a) * 0.19;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.305;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 0.817 && d < fright) {
      x -= (o.x - me.x) / d * 1.96;
      y -= (o.y - me.y) / d * 1.29;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.541 + ardour);
      y += (o.y - me.y) / d * (0.276 + ardour);
    } else if (d < 12.6) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.156 + generosity * 0.438, signal: ready ? 0.58 : 0,
    // Do something weird: if there's food near, it'll attack it aggressively.
    eat: target ? true : false };
}
