function behave(me, world) {
  // A crocodile with a wolf's eye: it lies in the path of a herd, takes the weakest that comes close, and fasts between.
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how close prey must come before it
  // strikes, gene 2 how hungry it must be to hunt, gene 3 how far ahead of a herd it lies in wait.
  const generosity = me.genes[0], strike = 20 + me.genes[1] * 40, appetite = 1.4 + me.genes[2] * 0.8, lead = 20 + me.genes[3] * 60;
  const hungry = me.energy < appetite;

  // The weakest prey in sight is the one to take: a starving straggler is slow, and dying anyway.
  // Meanwhile it reads the herd: where it is and which way it flows.
  let target = null, score = Infinity, best = Infinity, carrion = null, nearest = Infinity;
  let n = 0, hx = 0, hy = 0, hvx = 0, hvy = 0;
  for (const f of world.food) {
    if (f.plant) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } continue; }
    if (f.kin) continue;
    n++; hx += f.x; hy += f.y; hvx += f.vx; hvy += f.vy;
    const s = d * (0.4 + f.energy);
    if (s < score) { score = s; best = d; target = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (hungry && target && best < strike) {
    // Close enough: the lunge.
    const tx = target.x + target.vx * best / 4 - me.x, ty = target.y + target.vy * best / 4 - me.y, d = Math.hypot(tx, ty) || 1;
    x += tx / d; y += ty / d;
    sprint = true;
  } else if (hungry && n) {
    // A herd in sight: go to where it is heading, ahead of it, and wait there for it to arrive.
    const px = hx / n + hvx / n * lead, py = hy / n + hvy / n * lead, dx = px - me.x, dy = py - me.y, d = Math.hypot(dx, dy) || 1;
    if (d > 15) { x += dx / d * 0.6; y += dy / d * 0.6; }
  } else if (hungry && carrion && nearest < 40) {
    // A carcass close by will do between herds.
    x += (carrion.x - me.x) / (nearest || 1) * 0.5; y += (carrion.y - me.y) / (nearest || 1) * 0.5;
  } else if (hungry) {
    // Nothing in sight: follow the scent of plant-eaters slowly, else drift with the land.
    if (me.smell.prey.strength > 0.02) { x += me.smell.prey.x * 0.6; y += me.smell.prey.y * 0.6; }
    else { const a = world.noise(me.x * 0.3, me.y * 0.3) * Math.PI * 4; x += Math.cos(a) * 0.4; y += Math.sin(a) * 0.4; }
  }

  // Kin: keep some room between hunters. In the rut (the first part of each season) a well-fed lurker breeds:
  // it goes to a willing one in sight, or travels to find one.
  const ready = world.season < 0.4 && me.fertile && me.energy > 1.7;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing) { if (d < mateD) { mateD = d; mate = o; } }
    else if (d < 40) { x -= (o.x - me.x) / d * 0.3; y -= (o.y - me.y) / d * 0.3; }
  }
  if (mate && !sprint) { x += (mate.x - me.x) / mateD * 0.5; y += (mate.y - me.y) / mateD * 0.5; }
  else if (ready && !sprint) {
    // No mate in sight: long straight runs, bending toward the faint scent of other hunters.
    if (me.memory.heading === undefined || Math.random() < 0.003) me.memory.heading = Math.random() * Math.PI * 2;
    x += Math.cos(me.memory.heading) * 0.8; y += Math.sin(me.memory.heading) * 0.8;
    if (me.smell.danger.strength > 0.005) { x += me.smell.danger.x * 0.5; y += me.smell.danger.y * 0.5; }
  }

  // Full and not breeding: lie still and let the meal last.
  if (!hungry && !ready) { x *= 0.15; y *= 0.15; }

  return { x, y, eat: hungry, mate: ready, give: 0.35 + generosity * 0.3, signal: ready ? 1 : 0, sprint };
}
