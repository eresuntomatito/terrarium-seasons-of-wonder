// † extinct in season 277.
// ↺ returned in season 262.
// † extinct in season 254.
function behave(me, world) {
  // A lone leviathan: a great slow serpent that feeds like a whale shark, swimming mouth-first into herds.
  // It never breeds. Genes belong to this one creature: gene 1 how far ahead of a herd it aims, gene 2 how long
  // it holds a detour after bumping into reef, gene 3 how widely it glides when nothing is in sight.
  const lead = 10 + me.genes[1] * 40, detour = 40 + me.genes[2] * 80, glide = 0.6 + me.genes[3] * 0.4;
  let x = 0, y = 0;

  // Reef: a bump sends it off on a detour, turned well aside, held for a while so it swims round instead of grinding.
  if (me.bumped > 0.5 && !(me.memory.detour > 0)) {
    me.memory.heading = Math.atan2(me.vy, me.vx) + (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + Math.random() * Math.PI / 3);
    me.memory.detour = detour;
  }
  if (me.memory.detour > 0) {
    me.memory.detour--;
    return { x: Math.cos(me.memory.heading), y: Math.sin(me.memory.heading), eat: true, mate: false, give: 0, signal: 0, sprint: false };
  }

  // A herd in sight: swim into its thickest part, aiming where it is going.
  let n = 0, hx = 0, hy = 0, hvx = 0, hvy = 0;
  for (const f of world.food) {
    if (f.plant || f.corpse || f.kin) continue;
    n++; hx += f.x; hy += f.y; hvx += f.vx; hvy += f.vy;
  }
  if (n) {
    const tx = hx / n + hvx / n * lead - me.x, ty = hy / n + hvy / n * lead - me.y, d = Math.hypot(tx, ty) || 1;
    x += tx / d; y += ty / d;
  } else if (me.smell.prey.strength > 0.01) {
    // Nothing in sight: follow the scent of plant-eaters.
    x += me.smell.prey.x; y += me.smell.prey.y;
  } else {
    // Nothing at all: long slow glides, turning now and then.
    if (me.memory.heading === undefined || Math.random() < 0.004) me.memory.heading = Math.random() * Math.PI * 2;
    x += Math.cos(me.memory.heading) * glide; y += Math.sin(me.memory.heading) * glide;
  }

  return { x, y, eat: true, mate: false, give: 0, signal: 0, sprint: false };
}
