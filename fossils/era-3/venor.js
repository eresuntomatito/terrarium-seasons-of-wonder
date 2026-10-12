// † extinct in season 13.
// venor (W.1.1): branched from the galysathus (W.1) in season 13.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1], fright = 20 + me.genes[2] * 40;

  const target = world.food.length ? world.food[0] : null;
  let x = 0, y = 0;

  if (target) {
    x += (target.x - me.x) / Math.hypot(target.x - me.x, target.y - me.y);
    y += (target.y - me.y) / Math.hypot(target.x - me.x, target.y - me.y);
  } else {
    x += world.noise(me.x, me.y) * Math.PI * 2;
    y += world.noise(me.x, me.y) * Math.PI * 2;
  }

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
    } else if (d < 10) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.1 + generosity * 0.6, signal: ready ? 1 : 0 };
}
