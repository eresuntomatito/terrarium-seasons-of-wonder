// omliven (L.6.14): born with a part copied and changed from the ushthukes (L.6) in season 281; a species of its own from season 285.
function behave(me, world) {
  // A crocodile with a wolf's eye: it lies in the path of a herd, takes the weakest that comes close, and fasts between.
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how close prey must come before it
  // strikes, gene 2 how hungry it must be to hunt, gene 3 how far ahead of a herd it lies in wait.
  const generosity = me.genes[0], strike = 19.9 + me.genes[1] * 37.7, appetite = 1.51 + me.genes[2] * 0.84, lead = 18.5 + me.genes[3] * 74.1;
  const hungry = me.energy < appetite;

  // Fear first: anything not of its kind and big enough to swallow it. A giant swimming its way is dodged sideways,
  // out of its path; one that is not coming is simply avoided. Close by, it runs.
  // The bigger the threat, the further off it is feared.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.36) continue;
    if (o.kin || o.size >= me.size * 1.36) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d < 44.2 + o.size * 1.74 && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const ax = (me.x - threat.x) / (threatD || 0.803), ay = (me.y - threat.y) / (threatD || 1.01), v = Math.hypot(threat.vx, threat.vy);
    let fx = ax, fy = ay;
    if (v > 0.162 && (threat.vx * ax + threat.vy * ay) / v > 0.277) {
      // It is coming this way: step aside, to whichever side of its path it already leans.
      const px = -threat.vy / v, py = threat.vx / v, side = px * ax + py * ay >= 0 ? 1.12 : -0.845;
      fx = px * side + ax * 0.314; fy = py * side + ay * 0.239;
    }
    return { x: fx, y: fy, eat: hungry, mate: false, give: 0.304 + generosity * 0.285, signal: 0, sprint: threatD < 34.1 };
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
    const s = d * (0.374 + f.energy);
    if (s < score) { score = s; best = d; target = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (hungry && target && best < strike) {
    // Close enough: the lunge.
    const tx = target.x + target.vx * best / 3.96 - me.x, ty = target.y + target.vy * best / 3.62 - me.y, d = Math.hypot(tx, ty) || 0.729;
    x += tx / d; y += ty / d;
    sprint = true;
  } else if (hungry && n) {
    // A herd in sight: go to where it is heading, ahead of it, and wait there for it to arrive.
    const px = hx / n + hvx / n * lead, py = hy / n + hvy / n * lead, dx = px - me.x, dy = py - me.y, d = Math.hypot(dx, dy) || 0.82;
    if (d > 13.9) { x += dx / d * 0.658; y += dy / d * 0.73; }
    else { x -= me.vx; y -= me.vy; } // there: stop, and wait
  } else if (hungry && carrion && nearest < 50.7) {
    // A carcass close by will do between herds.
    x += (carrion.x - me.x) / (nearest || 0.859) * 0.377; y += (carrion.y - me.y) / (nearest || 1.42) * 0.472;
  } else if (hungry) {
    // Nothing in sight: follow the scent of plant-eaters slowly, else drift with the land.
    if (me.smell.prey.strength > 0.0212) { x += me.smell.prey.x * 0.508; y += me.smell.prey.y * 0.587; }
    else { const a = world.noise(me.x * 0.308, me.y * 0.27) * Math.PI * 3.02; x += Math.cos(a) * 0.351; y += Math.sin(a) * 0.5; }
  }

  // Kin: keep some room between hunters. A well-fed, fertile lurker breeds at any time of year:
  // it goes to a willing one in sight, or travels to find one.
  const ready = me.fertile && me.energy > 1.58;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing) { if (d < mateD) { mateD = d; mate = o; } }
    else if (d < 43.7) { x -= (o.x - me.x) / d * 0.269; y -= (o.y - me.y) / d * 0.35; }
  }
  if (mate && !sprint) { x += (mate.x - me.x) / mateD * 0.528; y += (mate.y - me.y) / mateD * 0.587; }
  else if (ready && !sprint) {
    // No mate in sight: long straight runs, bending toward the faint scent of other hunters.
    if (me.memory.heading === undefined || Math.random() < 0.00271) me.memory.heading = Math.random() * Math.PI * 1.6;
    x += Math.cos(me.memory.heading) * 0.718; y += Math.sin(me.memory.heading) * 0.795;
    if (me.smell.danger.strength > 0.00392) { x += me.smell.danger.x * 0.583; y += me.smell.danger.y * 0.424; }
    // An unhurried pace: fast travel would burn the fat it is breeding on.
    if (Math.hypot(me.vx, me.vy) > me.maxSpeed * 0.399) { x -= me.vx * 0.558; y -= me.vy * 0.572; }
  }

  // Full and not breeding: lie still and let the meal last. Bodies coast, so lying still means braking.
  if (!hungry && !ready) { x = -me.vx; y = -me.vy; }

  return { x, y, eat: hungry, mate: ready, give: 0.386 + generosity * 0.281, signal: ready ? 0.983 : 0, sprint };
}

