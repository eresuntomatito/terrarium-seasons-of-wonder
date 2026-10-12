// † extinct in season 34.
// zoe (W.17): branched from the wanderers (W) in season 34, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how eagerly it courts,
  // gene 2 how early it takes fright.
  const generosity = me.genes[0], ardour = me.genes[1], fright = 19.6 + me.genes[2] * 40.5;

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
    // Move towards the noise field in a slightly less noisy direction than the original behavior.
    const a = world.noise(me.x, me.y) * Math.PI * 3.02;
    x += Math.cos(a) * 0.417;
    y += Math.sin(a) * 0.456;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.26;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.15 && d < fright) {
      x -= (o.x - me.x) / d * 2.02;
      y -= (o.y - me.y) / d * 1.27;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.569 + ardour);
      y += (o.y - me.y) / d * (0.289 + ardour);
    } else if (d < 13.1) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  // Bolt when something that could eat it is close.
  const sprinting = world.others.some(o => !o.kin && o.size >= me.size * 1.4 && Math.hypot(o.x - me.x, o.y - me.y) < fright * 0.658);
  if (sprinting) {
    x *= 1.6;
    y *= 1.6;
  }

  return { x, y, mate: ready, give: 0.197 + generosity * 0.413, signal: ready ? 0.583 : 0,
    // Bolt when something that could eat it is close.
    sprint: sprinting };
}
