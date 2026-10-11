// gigaplex (W.1.9): branched from the galysathus (W.1) in season 42, written by claude-haiku.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1], fright = 20.3 + me.genes[2] * 32.2;

  // Starvation threshold: below this, enter desperation mode
  const desperate = me.energy < 0.35;

  // Find closest food
  let target = null, best = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  let x = 0, y = 0;

  if (target) {
    // When desperate: hunt with 50% more intensity
    const intensity = desperate ? 1.5 : 1;
    x += (target.x - me.x) / best * intensity;
    y += (target.y - me.y) / best * intensity;
  } else {
    // No food found: drift along noise field
    const a = world.noise(me.x, me.y) * Math.PI * 2.77;
    x += Math.cos(a) * 0.68;
    y += Math.sin(a) * 0.788;
  }

  // Breeding threshold changes based on desperation
  const readyNormal = me.fertile && me.energy > 0.48;
  const readyDesperate = me.fertile && me.energy > 0.32;
  const ready = desperate ? readyDesperate : readyNormal;

  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;

    if (desperate) {
      // Desperation mode: ignore all non-kin threats, focus only on kin for breeding
      if (ready && o.kin && o.willing) {
        x += (o.x - me.x) / d * (0.628 + ardour);
        y += (o.y - me.y) / d * (0.389 + ardour);
      }
      // No threat avoidance or spacing when desperate
    } else {
      // Normal caution mode
      if (!o.kin && o.size >= me.size * 1.11 && d < fright) {
        x -= (o.x - me.x) / d * 1.78;
        y -= (o.y - me.y) / d * 2.63;
      } else if (ready && o.kin && o.willing) {
        x += (o.x - me.x) / d * (0.628 + ardour);
        y += (o.y - me.y) / d * (0.389 + ardour);
      } else if (d < 11.3) {
        x -= (o.x - me.x) / d;
        y -= (o.y - me.y) / d;
      }
    }
  }

  return { x, y, mate: ready, give: 0.125 + generosity * 0.577, signal: ready ? 0.737 : 0 };
}
