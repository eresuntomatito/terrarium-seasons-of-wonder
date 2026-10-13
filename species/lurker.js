// † extinct in season 352.
// ↺ returned in season 351.
// † extinct in season 350.
// ↺ returned in season 349.
// † extinct in season 300.
// ↺ returned in season 298.
// † extinct in season 291.
// ↺ returned in season 290.
// † extinct in season 286.
// ↺ returned in season 285.
// † extinct in season 270.
function behave(me, world) {
  // A crocodile with a wolf's eye: it lies in the path of a herd, takes the weakest that comes close, and fasts between.
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how close prey must come before it
  // strikes, gene 2 how hungry it must be to hunt, gene 3 how far ahead of a herd it lies in wait.
  const generosity = me.genes[0], strike = 20 + me.genes[1] * 40, appetite = 1.4 + me.genes[2] * 0.8, lead = 20 + me.genes[3] * 60;
  const hungry = me.energy < appetite;

  // Fear first: anything not of its kind and big enough to swallow it. A giant swimming its way is dodged sideways,
  // out of its path; one that is not coming is simply avoided. Close by, it runs.
  // The bigger the threat, the further off it is feared.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.2) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d < 40 + o.size * 2.5 && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const ax = (me.x - threat.x) / (threatD || 1), ay = (me.y - threat.y) / (threatD || 1), v = Math.hypot(threat.vx, threat.vy);
    let fx = ax, fy = ay;
    if (v > 0.2 && (threat.vx * ax + threat.vy * ay) / v > 0.3) {
      // It is coming this way: step aside, to whichever side of its path it already leans.
      const px = -threat.vy / v, py = threat.vx / v, side = px * ax + py * ay >= 0 ? 1 : -1;
      fx = px * side + ax * 0.3; fy = py * side + ay * 0.3;
    }
    return { x: fx, y: fy, eat: hungry, mate: false, give: 0.35 + generosity * 0.3, signal: 0, sprint: threatD < 35 };
  }

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
    // Ahead of the herd, but off to its flank: giants aim at the herd's heart, so the front is no place to wait.
    const hv = Math.hypot(hvx, hvy) || 1, side = (me.memory.flank ??= Math.random() < 0.5 ? 1 : -1) * 40;
    const px = hx / n + hvx / n * lead - hvy / hv * side, py = hy / n + hvy / n * lead + hvx / hv * side, dx = px - me.x, dy = py - me.y, d = Math.hypot(dx, dy) || 1;
    if (d > 15) { x += dx / d * 0.6; y += dy / d * 0.6; }
    else { x -= me.vx; y -= me.vy; } // there: stop, and wait
  } else if (hungry && carrion && nearest < 40) {
    // A carcass close by will do between herds.
    x += (carrion.x - me.x) / (nearest || 1) * 0.5; y += (carrion.y - me.y) / (nearest || 1) * 0.5;
  } else if (hungry) {
    // Nothing in sight: follow the scent of plant-eaters slowly, else drift with the land.
    if (me.smell.prey.strength > 0.02) { x += me.smell.prey.x * 0.6; y += me.smell.prey.y * 0.6; }
    else { const a = world.noise(me.x * 0.3, me.y * 0.3) * Math.PI * 4; x += Math.cos(a) * 0.4; y += Math.sin(a) * 0.4; }
  }

  // Kin: keep some room between hunters. A well-fed, fertile lurker breeds at any time of year:
  // it goes to a willing one in sight, or travels to find one.
  const ready = me.fertile && me.energy > 1.7;
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
    // An unhurried pace: fast travel would burn the fat it is breeding on.
    if (Math.hypot(me.vx, me.vy) > me.maxSpeed * 0.5) { x -= me.vx * 0.5; y -= me.vy * 0.5; }
  }

  // Full and not breeding: lie still and let the meal last. Bodies coast, so lying still means braking.
  if (!hungry && !ready) { x = -me.vx; y = -me.vy; }

  return { x, y, eat: hungry, mate: ready, give: 0.35 + generosity * 0.3, signal: ready ? 1 : 0, sprint };
}
