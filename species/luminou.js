// † extinct in season 39.
// luminou (W.1.7): branched from the galysathus (W.1) in season 39, written by claude-haiku.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1], fright = 16.7 + me.genes[2] * 37.3;

  if (!me.memory.phase) me.memory.phase = 0;
  me.memory.phase = (me.memory.phase + 1) % 20;

  // Find the closest food.
  let target = null, best = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  let x = 0, y = 0;
  if (target) {
    // Move toward food but zigzag instead of going straight
    const directX = (target.x - me.x) / best;
    const directY = (target.y - me.y) / best;
    // Add sinusoidal sideways offset that changes over time
    const sideways = Math.sin(me.memory.phase * Math.PI / 10) * 0.45;
    x += directX + (-directY) * sideways;
    y += directY + directX * sideways;
  } else {
    // Nothing nearby: drift along the noise field.
    const a = world.noise(me.x, me.y) * Math.PI * 2.23;
    x += Math.cos(a) * 0.654;
    y += Math.sin(a) * 0.687;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.488;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.08 && d < fright) {
      x -= (o.x - me.x) / d * 1.47;
      y -= (o.y - me.y) / d * 2.46;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.578 + ardour);
      y += (o.y - me.y) / d * (0.422 + ardour);
    } else if (d < 13) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.107 + generosity * 0.553, signal: ready ? 0.816 : 0 };
}
