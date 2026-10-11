// bumblebee: branched from the wanderers in season 10.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1];

  let target = null, best = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  let x = 0, y = 0;
  if (target) {
    x += (target.x - me.x) / best * 0.6;
    y += (target.y - me.y) / best * 0.6;
  } else {
    // Drift along the noise field, looking for flowers that match its colour.
    const hue = me.hue % 360;
    const a = world.noise(me.x, me.y) * Math.PI * 2;
    const color = Math.cos(a) * 0.6 + Math.sin(a) * 0.4;
    const targetHue = (hue + 60 * (color < 0.5)) % 360;

    let closeTarget = null, bestDistance = Infinity;
    for (const f of world.food) {
      const d = Math.hypot(f.x - me.x, f.y - me.y);
      if (d < bestDistance && f.hue === targetHue) { closeTarget = f; bestDistance = d; }
    }

    if (closeTarget) {
      x += (closeTarget.x - me.x) / bestDistance * 0.6;
      y += (closeTarget.y - me.y) / bestDistance * 0.6;
    } else {
      // Drift along the noise field, looking for flowers that match its colour.
      const hue = me.hue % 360;
      const a = world.noise(me.x, me.y) * Math.PI * 2;
      const color = Math.cos(a) * 0.6 + Math.sin(a) * 0.4;
      const targetHue = (hue + 60 * (color < 0.5)) % 360;

      let closeTarget = null, bestDistance = Infinity;
      for (const f of world.food) {
        const d = Math.hypot(f.x - me.x, f.y - me.y);
        if (d < bestDistance && f.hue === targetHue) { closeTarget = f; bestDistance = d; }
      }

      if (closeTarget) {
        x += (closeTarget.x - me.x) / bestDistance * 0.6;
        y += (closeTarget.y - me.y) / bestDistance * 0.6;
      } else {
        // Move in a random direction.
        x += Math.random() * 0.3 - 0.15;
        y += Math.random() * 0.3 - 0.15;
      }
    }
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

  return { x, y, mate: ready, give: 0.2 + generosity * 0.4, signal: ready ? 1 : 0 };
}
