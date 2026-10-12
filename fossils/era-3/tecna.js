// † extinct in season 38.
// tecna (W.1.6): branched from the galysathus (W.1) in season 38, written by claude-haiku.
function behave(me, world) {
  // Genes: gene 0 is generosity, gene 1 is ardour, gene 2 is fright threshold
  const generosity = me.genes[0], ardour = me.genes[1], fright = 17 + me.genes[2] * 35.4;

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
    // STRANGE: Move against the noise field, not with it. Perverse navigation.
    const a = world.noise(me.x, me.y) * Math.PI * 2.32;
    x -= Math.cos(a) * 0.618;
    y -= Math.sin(a) * 0.72;
  }

  // INVERTED SOCIAL DRIVES: flees willing mates, approaches predators.
  const ready = me.fertile && me.energy > 0.482;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.06 && d < fright * 1.8) {
      // Drawn to things that could eat it. Suicidal attraction.
      x += (o.x - me.x) / d * 0.91;
      y += (o.y - me.y) / d * 0.91;
    } else if (ready && o.kin && o.willing) {
      // Repelled by willing mates. Rejects reproduction.
      x -= (o.x - me.x) / d * (0.561 + ardour);
      y -= (o.y - me.y) / d * (0.441 + ardour);
    } else if (d < 14.4) {
      x -= (o.x - me.x) / d * 0.3;
      y -= (o.y - me.y) / d * 0.3;
    }
  }

  return { x, y, mate: ready, give: 0.106 + generosity * 0.579, signal: ready ? 0.806 : 0 };
}
