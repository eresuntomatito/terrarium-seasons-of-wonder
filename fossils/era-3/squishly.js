// † extinct in season 37.
// squishly (W.1.5): branched from the galysathus (W.1) in season 37, written by claude-haiku.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1], fright = 17.5 + me.genes[2] * 36.4;

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
    // STRANGE 1: Orbit around the world center instead of drifting on noise field.
    const cx = world.width / 2, cy = world.height / 2;
    const angle = Math.atan2(me.y - cy, me.x - cx);
    const newAngle = angle + 0.15;
    const radius = Math.hypot(me.x - cx, me.y - cy);
    const targetX = cx + Math.cos(newAngle) * radius;
    const targetY = cy + Math.sin(newAngle) * radius;
    const d = Math.hypot(targetX - me.x, targetY - me.y);
    if (d > 0) {
      x += (targetX - me.x) / d * 0.667;
      y += (targetY - me.y) / d * 0.757;
    }
  }

  // Flee anything big enough to eat it.
  const ready = me.fertile && me.energy > 0.538;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.07 && d < fright) {
      x -= (o.x - me.x) / d * 1.33;
      y -= (o.y - me.y) / d * 2.04;
    } else if (ready && o.kin && o.willing) {
      // STRANGE 2: FLEE from willing kin instead of approaching them.
      // This creature signals desire to mate but runs away from potential partners.
      x -= (o.x - me.x) / d * (0.535 + ardour);
      y -= (o.y - me.y) / d * (0.517 + ardour);
    } else if (d < 13.9) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.107 + generosity * 0.7, signal: ready ? 0.786 : 0 };
}
