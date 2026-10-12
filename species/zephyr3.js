// † extinct in season 18.
// zephyr3 (W.10): branched from the wanderers (W) in season 18, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how eagerly it courts,
  // gene 2 how early it takes fright.
  const generosity = me.genes[0], ardour = me.genes[1], fright = 20.7 + me.genes[2] * 37.1;

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
    // Seek food using a slightly different path.
    x += Math.cos(Math.PI / 4) * 0.738;
    y += Math.sin(Math.PI / 4) * 0.738;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.319;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.17 && d < fright) {
      x -= (o.x - me.x) / d * 1.95;
      y -= (o.y - me.y) / d * 1.62;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.455 + ardour);
      y += (o.y - me.y) / d * (0.443 + ardour);
    } else if (d < 17.2) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  // Bolt when something that could eat it is close.
  const sprint = world.others.some(o => !o.kin && o.size >= me.size * 1.13 && Math.hypot(o.x - me.x, o.y - me.y) < fright * 0.581);

  return { x, y, mate: ready, give: 0.141 + generosity * 0.432, signal: ready ? 0.758 : 0,
    sprint: sprint };
}
