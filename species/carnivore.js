// carnivore (W.18): branched from the wanderers (W) in season 38, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how eagerly it courts,
  // gene 2 how early it takes fright.
  const generosity = me.genes[0], ardour = me.genes[1], fright = 19.4 + me.genes[2] * 40.1;

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
    // Seek food in the direction of the sun, or avoid other creatures.
    const sunDir = Math.PI * (world.noise(me.x, me.y) + 1) / 2;
    x += Math.cos(sunDir) * 0.455;
    y += Math.sin(sunDir) * 0.497;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.263;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.09 && d < fright) {
      x -= (o.x - me.x) / d * 1.89;
      y -= (o.y - me.y) / d * 1.24;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.558 + ardour);
      y += (o.y - me.y) / d * (0.314 + ardour);
    } else if (d < 13.8) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.237 + generosity * 0.38, signal: ready ? 0.639 : 0,
    // Bolt when something that could eat it is close.
    sprint: world.others.some(o => !o.kin && o.size >= me.size * 1.42 && Math.hypot(o.x - me.x, o.y - me.y) < fright * 0.662) };
}
