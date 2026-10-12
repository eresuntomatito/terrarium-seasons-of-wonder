// hawk (W.15): branched from the wanderers (W) in season 30, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how eagerly it courts,
  // gene 2 how early it takes fright.
  const generosity = me.genes[0], ardour = me.genes[1], fright = 18.4 + me.genes[2] * 37.6;

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
    // Follow the noise field in a strange way.
    const a = world.noise(me.x, me.y) * Math.PI * 2.94;
    x += Math.cos(a) * 0.475;
    y += Math.sin(a) * 0.363;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.257;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.11 && d < fright) {
      x -= (o.x - me.x) / d * 2.23;
      y -= (o.y - me.y) / d * 1.49;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.419 + ardour);
      y += (o.y - me.y) / d * (0.381 + ardour);
    } else if (d < 14.5) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.239 + generosity * 0.401, signal: ready ? 0.725 : 0,
    // Burst at 1.8 times its speed while stamina lasts (it drains fast, and recovers slowly when not sprinting).
    sprint: world.others.some(o => !o.kin && o.size >= me.size * 1.1 && Math.hypot(o.x - me.x, o.y - me.y) < fright * 0.864) };
}
