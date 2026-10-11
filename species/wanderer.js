// ↺ returned in season 7.
// † extinct in season 7.
// ↺ returned in season 6.
// † extinct in season 5.
// ↺ returned in season 3.
// † extinct in season 3.
// ↺ returned in season 2.
// † extinct in season 1.
// † extinct in season 1.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how eagerly it courts,
  // gene 2 how early it takes fright.
  const generosity = me.genes[0], ardour = me.genes[1], fright = 20 + me.genes[2] * 40;

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
    // Nothing nearby: drift along the noise field.
    const a = world.noise(me.x, me.y) * Math.PI * 2;
    x += Math.cos(a) * 0.5;
    y += Math.sin(a) * 0.5;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.9;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.2 && d < fright) {
      x -= (o.x - me.x) / d * 2;
      y -= (o.y - me.y) / d * 2;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.5 + ardour);
      y += (o.y - me.y) / d * (0.5 + ardour);
    } else if (d < 15) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.2 + generosity * 0.4, signal: ready ? 1 : 0 };
}
