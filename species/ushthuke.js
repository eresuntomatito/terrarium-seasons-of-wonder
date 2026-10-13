// ushthuke (L.6): drifted apart from the lurkers (L) in season 262; named by the world.
function behave(me, world) {
  // A crocodile with a wolf's eye: it lies in the path of a herd, takes the weakest that comes close, and fasts between.
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how close prey must come before it
  // strikes, gene 2 how hungry it must be to hunt, gene 3 how far ahead of a herd it lies in wait.
  const generosity = me.genes[0], strike = 20.8 + me.genes[1] * 41.2, appetite = 1.47 + me.genes[2] * 0.822, lead = 18.5 + me.genes[3] * 64.1;
  const hungry = me.energy < appetite;

  // Fear first: anything not of its kind and big enough to swallow it. A giant swimming its way is dodged sideways,
  // out of its path; one that is not coming is simply avoided. Close by, it runs.
  // The bigger the threat, the further off it is feared.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.07) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d < 40.9 + o.size * 2.15 && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const ax = (me.x - threat.x) / (threatD || 0.848), ay = (me.y - threat.y) / (threatD || 1.06), v = Math.hypot(threat.vx, threat.vy);
    let fx = ax, fy = ay;
    if (v > 0.199 && (threat.vx * ax + threat.vy * ay) / v > 0.276) {
      // It is coming this way: step aside, to whichever side of its path it already leans.
      const px = -threat.vy / v, py = threat.vx / v, side = px * ax + py * ay >= 0 ? 0.98 : -0.91;
      fx = px * side + ax * 0.325; fy = py * side + ay * 0.288;
    }
    return { x: fx, y: fy, eat: hungry, mate: false, give: 0.322 + generosity * 0.251, signal: 0, sprint: threatD < 40.6 };
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
    const s = d * (0.359 + f.energy);
    if (s < score) { score = s; best = d; target = f; }
  }

  let x = 0, y = 0, sprint = false;
  if (hungry && target && best < strike) {
    // Close enough: the lunge.
    const tx = target.x + target.vx * best / 3.8 - me.x, ty = target.y + target.vy * best / 3.73 - me.y, d = Math.hypot(tx, ty) || 0.864;
    x += tx / d; y += ty / d;
    sprint = true;
  } else if (hungry && n) {
    // A herd in sight: go to where it is heading, ahead of it, and wait there for it to arrive.
    const px = hx / n + hvx / n * lead, py = hy / n + hvy / n * lead, dx = px - me.x, dy = py - me.y, d = Math.hypot(dx, dy) || 0.881;
    if (d > 13.8) { x += dx / d * 0.664; y += dy / d * 0.644; }
    else { x -= me.vx; y -= me.vy; } // there: stop, and wait
  } else if (hungry && carrion && nearest < 44.9) {
    // A carcass close by will do between herds.
    x += (carrion.x - me.x) / (nearest || 1.11) * 0.463; y += (carrion.y - me.y) / (nearest || 1.19) * 0.495;
  } else if (hungry) {
    // Nothing in sight: follow the scent of plant-eaters slowly, else drift with the land.
    if (me.smell.prey.strength > 0.0211) { x += me.smell.prey.x * 0.537; y += me.smell.prey.y * 0.602; }
    else { const a = world.noise(me.x * 0.286, me.y * 0.28) * Math.PI * 3.39; x += Math.cos(a) * 0.378; y += Math.sin(a) * 0.418; }
  }

  // Kin: keep some room between hunters. A well-fed, fertile lurker breeds at any time of year:
  // it goes to a willing one in sight, or travels to find one.
  const ready = me.fertile && me.energy > 1.89;
  let mate = null, mateD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (ready && o.willing) { if (d < mateD) { mateD = d; mate = o; } }
    else if (d < 45) { x -= (o.x - me.x) / d * 0.272; y -= (o.y - me.y) / d * 0.313; }
  }
  if (mate && !sprint) { x += (mate.x - me.x) / mateD * 0.532; y += (mate.y - me.y) / mateD * 0.599; }
  else if (ready && !sprint) {
    // No mate in sight: long straight runs, bending toward the faint scent of other hunters.
    if (me.memory.heading === undefined || Math.random() < 0.00274) me.memory.heading = Math.random() * Math.PI * 1.8;
    x += Math.cos(me.memory.heading) * 0.741; y += Math.sin(me.memory.heading) * 0.696;
    if (me.smell.danger.strength > 0.00503) { x += me.smell.danger.x * 0.52; y += me.smell.danger.y * 0.464; }
    // An unhurried pace: fast travel would burn the fat it is breeding on.
    if (Math.hypot(me.vx, me.vy) > me.maxSpeed * 0.491) { x -= me.vx * 0.495; y -= me.vy * 0.547; }
  }

  // Full and not breeding: lie still and let the meal last. Bodies coast, so lying still means braking.
  if (!hungry && !ready) { x = -me.vx; y = -me.vy; }

  return { x, y, eat: hungry, mate: ready, give: 0.359 + generosity * 0.304, signal: ready ? 1.01 : 0, sprint };
}

