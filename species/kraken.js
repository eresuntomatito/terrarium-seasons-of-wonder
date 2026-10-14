// ↺ returned in season 512.
// † extinct in season 511.
// ↺ returned in season 504.
// † extinct in season 503.
// ↺ returned in season 500.
// † extinct in season 499.
// ↺ returned in season 491.
// † extinct in season 490.
// ↺ returned in season 483.
// † extinct in season 482.
// ↺ returned in season 473.
// † extinct in season 472.
// ↺ returned in season 464.
// † extinct in season 463.
// ↺ returned in season 455.
// † extinct in season 454.
// ↺ returned in season 444.
// † extinct in season 443.
// ↺ returned in season 435.
// † extinct in season 434.
// ↺ returned in season 427.
// † extinct in season 425.
// ↺ returned in season 425.
// † extinct in season 424.
// ↺ returned in season 418.
// † extinct in season 417.
// ↺ returned in season 409.
// † extinct in season 407.
// ↺ returned in season 403.
// † extinct in season 402.
// ↺ returned in season 395.
// † extinct in season 394.
// ↺ returned in season 387.
// † extinct in season 386.
// ↺ returned in season 381.
// † extinct in season 378.
// ↺ returned in season 372.
// † extinct in season 371.
// ↺ returned in season 364.
// † extinct in season 363.
// ↺ returned in season 357.
// † extinct in season 356.
// ↺ returned in season 349.
// † extinct in season 348.
// ↺ returned in season 343.
// † extinct in season 341.
// ↺ returned in season 337.
// † extinct in season 336.
// ↺ returned in season 328.
// † extinct in season 327.
// ↺ returned in season 322.
// † extinct in season 321.
// ↺ returned in season 313.
// † extinct in season 312.
function behave(me, world) {
  // A lone kraken: a soft giant that drifts after herds in slow pulses and seizes what its tentacles reach.
  // It never breeds. Genes belong to this one creature: gene 1 how far ahead of a herd it aims, gene 2 how long
  // it follows a wall after bumping into reef, gene 3 the rhythm of its pulses.
  const lead = 10 + me.genes[1] * 30, detour = 8 + me.genes[2] * 12, rhythm = 20 + me.genes[3] * 30;
  let x = 0, y = 0;
  // Satiation is the world's (it follows the herds, season by season): its tentacles are always open here.
  const feeding = true;

  // Where it wants to go: the heart of the herd in sight (aimed ahead), else the nearest prey, else the scent of prey.
  let n = 0, hx = 0, hy = 0, hvx = 0, hvy = 0, near = null, nearD = Infinity;
  for (const f of world.food) {
    if (f.plant || f.corpse || f.kin) continue;
    n++; hx += f.x; hy += f.y; hvx += f.vx; hvy += f.vy;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < nearD) { nearD = d; near = f; }
  }
  let gx = 0, gy = 0;
  if (near && nearD < 40) { gx = near.x - me.x; gy = near.y - me.y; }
  else if (n) { gx = hx / n + hvx / n * lead - me.x; gy = hy / n + hvy / n * lead - me.y; }
  else if (me.smell.prey.strength > 0.01) { gx = me.smell.prey.x; gy = me.smell.prey.y; }
  const gd = Math.hypot(gx, gy) || 1;
  // Rage: plenty of food in sight yet the reef keeps turning it away: it heaves the reef aside (the world allows it rarely).
  const rage = n >= 8 && me.bumped > 4;
  // Desperation: bounced about with prey in sight (sooner when hungry), it stops going round and shoves the reef aside.
  const shove = ((n > 0 || !!near) && me.bumped > (me.energy < 3 ? 1 : 2.5)) || (me.energy < 2.5 && me.bumped > 3); // or starving and walled in

  // Desperate, it heads straight for its goal through whatever is in the way.
  if (shove) return { x: gx / gd, y: gy / gd, eat: feeding, mate: false, give: 0, signal: 0, sprint: false, shove, rage };

  // Reef: a bump turns it along the wall, to whichever side bends toward where it wants to go, for a short while
  // (like an octopus working round coral), instead of a long blind detour.
  if (me.bumped > 0.5 && !(me.memory.detour > 0)) {
    const h = Math.atan2(me.vy, me.vx), left = h + Math.PI / 2, right = h - Math.PI / 2;
    const toward = a => Math.cos(a) * gx / gd + Math.sin(a) * gy / gd;
    me.memory.heading = (n || near || me.smell.prey.strength > 0.01 ? toward(left) >= toward(right) : Math.random() < 0.5) ? left : right;
    me.memory.detour = detour;
  }
  if (me.memory.detour > 0) {
    me.memory.detour--;
    return { x: Math.cos(me.memory.heading) + gx / gd * 0.3, y: Math.sin(me.memory.heading) + gy / gd * 0.3, eat: feeding, mate: false, give: 0, signal: 0, sprint: false, shove, rage };
  }

  // Toward its goal; with nothing at all to follow, long slow glides.
  if (n || near || me.smell.prey.strength > 0.01) { x += gx / gd; y += gy / gd; }
  else {
    if (me.memory.heading === undefined || Math.random() < 0.004) me.memory.heading = Math.random() * Math.PI * 2;
    x += Math.cos(me.memory.heading) * 0.7; y += Math.sin(me.memory.heading) * 0.7;
  }

  // It moves in pulses: a push, then a glide.
  const pulse = (world.t % rhythm) < rhythm * 0.5 ? 1 : 0.5;
  return { x: x * pulse, y: y * pulse, eat: feeding, mate: false, give: 0, signal: 0, sprint: false, shove, rage };
}
