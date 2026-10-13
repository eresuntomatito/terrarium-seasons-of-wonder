function behave(me, world) {
  // A lone kraken: a soft giant that drifts after herds in slow pulses and seizes what its tentacles reach.
  // It never breeds. Genes belong to this one creature: gene 1 how far ahead of a herd it aims, gene 2 how long
  // it holds a detour after bumping into reef, gene 3 the rhythm of its pulses.
  const lead = 10 + me.genes[1] * 30, detour = 30 + me.genes[2] * 60, rhythm = 20 + me.genes[3] * 30;
  let x = 0, y = 0;

  // Reef: a bump sends it off to one side for a while, so it flows round instead of pressing.
  if (me.bumped > 0.5 && !(me.memory.detour > 0)) {
    me.memory.heading = Math.atan2(me.vy, me.vx) + (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + Math.random() * Math.PI / 3);
    me.memory.detour = detour;
  }
  if (me.memory.detour > 0) {
    me.memory.detour--;
    return { x: Math.cos(me.memory.heading), y: Math.sin(me.memory.heading), eat: true, mate: false, give: 0, signal: 0, sprint: false };
  }

  // A herd in sight: drift toward its heart, aiming where it is going.
  let n = 0, hx = 0, hy = 0, hvx = 0, hvy = 0, near = null, nearD = Infinity;
  for (const f of world.food) {
    if (f.plant || f.corpse || f.kin) continue;
    n++; hx += f.x; hy += f.y; hvx += f.vx; hvy += f.vy;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < nearD) { nearD = d; near = f; }
  }
  if (near && nearD < 40) {
    // Close: reach straight for the nearest.
    x += (near.x - me.x) / (nearD || 1); y += (near.y - me.y) / (nearD || 1);
  } else if (n) {
    const tx = hx / n + hvx / n * lead - me.x, ty = hy / n + hvy / n * lead - me.y, d = Math.hypot(tx, ty) || 1;
    x += tx / d; y += ty / d;
  } else if (me.smell.prey.strength > 0.01) {
    x += me.smell.prey.x; y += me.smell.prey.y;
  } else {
    if (me.memory.heading === undefined || Math.random() < 0.004) me.memory.heading = Math.random() * Math.PI * 2;
    x += Math.cos(me.memory.heading) * 0.7; y += Math.sin(me.memory.heading) * 0.7;
  }

  // It moves in pulses: a push, then a glide.
  const pulse = (world.t % rhythm) < rhythm * 0.5 ? 1 : 0.5;
  return { x: x * pulse, y: y * pulse, eat: true, mate: false, give: 0, signal: 0, sprint: false };
}
