// † extinct in season 33.
// flicker2 (W.16): branched from the wanderers (W) in season 32, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1], fright = 17.2 + me.genes[2] * 37.9;

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
    // Go in a zigzag pattern around the noise field.
    const a = world.noise(me.x, me.y) * Math.PI * 3.06;
    x += Math.cos(a) * 0.434;
    y += Math.sin(a) * 0.465;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.259;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.16 && d < fright) {
      x -= (o.x - me.x) / d * 2.14;
      y -= (o.y - me.y) / d * 1.38;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.491 + ardour);
      y += (o.y - me.y) / d * (0.305 + ardour);
    } else if (d < 12.6) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  // Always sprint when near food.
  if (target) {
    x += (target.x - me.x) / Math.hypot(target.x - me.x, target.y - me.y) * 1.56;
    y += (target.y - me.y) / Math.hypot(target.x - me.x, target.y - me.y) * 1.56;
  }

  return { x, y, mate: ready, give: 0.188 + generosity * 0.504, signal: ready ? 0.67 : 0,
    // Bolt when something that could eat it is close.
    sprint: world.others.some(o => !o.kin && o.size >= me.size * 1.35 && Math.hypot(o.x - me.x, o.y - me.y) < fright * 0.702) };
}
