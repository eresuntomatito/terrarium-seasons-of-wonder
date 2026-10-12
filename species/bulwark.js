// bulwark (W.20): branched from the wanderers (W) in season 59, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1], fright = 19.7 + me.genes[2] * 31.1;

  const target = world.food.find(f => Math.hypot(f.x - me.x, f.y - me.y) < 0.25); // Find the closest food

  let x = 0, y = 0;
  if (target) {
    x += (target.x - me.x) / target.size;
    y += (target.y - me.y) / target.size;
  } else {
    const a = world.noise(me.x, me.y) * Math.PI * 4.72;
    x += Math.cos(a) * 0.272;
    y += Math.sin(a) * 0.461;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.317;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 0.609 && d < fright) {
      x -= (o.x - me.x) / d * 2.03;
      y -= (o.y - me.y) / d * 1.37;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.536 + ardour);
      y += (o.y - me.y) / d * (0.272 + ardour);
    } else if (d < 12.5) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.157 + generosity * 0.436, signal: ready ? 0.593 : 0,
    // Bolt when something that could eat it is close.
    sprint: world.others.some(o => !o.kin && o.size >= me.size * 1.2 && Math.hypot(o.x - me.x, o.y - me.y) < fright * 0.584) };
}
