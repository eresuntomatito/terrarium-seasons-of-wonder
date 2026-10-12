// † extinct in season 13.
// fiquizu: branched from the wanderers in season 13.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how eagerly it courts.
  const generosity = me.genes[0], ardour = me.genes[1];

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

  // When well fed, look for a willing partner of its own kind; otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.9;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.5 + ardour);
      y += (o.y - me.y) / d * (0.5 + ardour);
    } else if (d < 15) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.3 + generosity * 0.3, signal: ready ? 1 : 0 };
}
