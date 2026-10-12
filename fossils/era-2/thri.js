// † extinct in season 10.
// thri: branched from the wanderers in season 8.
function behave(me, world) {
  const generosity = me.genes[0];
  const ardour = me.genes[1];
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
    const a = world.noise(me.x, me.y) * Math.PI * 2;
    x += Math.cos(a) * 0.7;
    y += Math.sin(a) * 0.7;
  }

  const ready = me.fertile && me.energy > 0.9;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.8 + ardour);
      y += (o.y - me.y) / d * (0.8 + ardour);
    } else if (d < 10) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.5 + generosity * 0.3, signal: ready ? 1 : 0 };
}
