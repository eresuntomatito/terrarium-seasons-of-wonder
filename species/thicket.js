// † extinct in season 17.
// thicket (W.9): branched from the wanderers (W) in season 17, written by qwen2.5-coder:1.5b.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how eagerly it courts,
  // gene 2 how early it takes fright.
  const generosity = me.genes[0], ardour = me.genes[1], fright = 21.6 + me.genes[2] * 38.8;

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
    // Move randomly to avoid predators and stay close to other creatures.
    x += Math.random() * 0.823 - 0.4115;
    y += Math.random() * 0.823 - 0.4115;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner of its own kind;
  // otherwise keep a little distance.
  const ready = me.fertile && me.energy > 0.335;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.16 && d < fright) {
      x -= (o.x - me.x) / d * 1.91;
      y -= (o.y - me.y) / d * 1.7;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.479 + ardour);
      y += (o.y - me.y) / d * (0.451 + ardour);
    } else if (d < 18.6) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.238 + generosity * 0.475, signal: ready ? 0.85 : 0,
    // Bolt when something that could eat it is close.
    sprint: world.others.some(o => !o.kin && o.size >= me.size * 1.19 && Math.hypot(o.x - me.x, o.y - me.y) < fright * 0.593) };
}
