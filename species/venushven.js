// venushven (S.65): drifted apart from the stalkers (S) in season 357; named by the world.
// ↺ returned in season 314.
// † extinct in season 314.
// ↺ returned in season 313.
// † extinct in season 312.
// ↺ returned in season 308.
// † extinct in season 308.
// ↺ returned in season 307.
// † extinct in season 307.
// ↺ returned in season 307.
// † extinct in season 307.
// ↺ returned in season 307.
// † extinct in season 307.
// ↺ returned in season 306.
// † extinct in season 306.
// ↺ returned in season 306.
// † extinct in season 304.
// ↺ returned in season 303.
// † extinct in season 303.
// ↺ returned in season 303.
// † extinct in season 303.
// ↺ returned in season 303.
// † extinct in season 303.
// ↺ returned in season 302.
// † extinct in season 302.
// ↺ returned in season 301.
// † extinct in season 300.
// ↺ returned in season 300.
// † extinct in season 300.
// ↺ returned in season 299.
// † extinct in season 247.
// ↺ returned in season 246.
// † extinct in season 129.
// ↺ returned in season 124.
// † extinct in season 102.
// ↺ returned in season 54.
// † extinct in season 53.
// ↺ returned in season 52.
// † extinct in season 52.
// ↺ returned in season 51.
// † extinct in season 51.
// ↺ returned in season 44.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how much it trusts its nose.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.31 + me.genes[2] * 0.826, nose = me.genes[3];

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  // Carrion is a fallback: it scavenges only when nothing alive is in sight.
  let target = null, best = Infinity, carrion = null, nearest = Infinity, plant = null, plantD = Infinity;
  // Giants that could swallow it: prey close to one of them is left alone (no chasing into a giant's mouth).
  const giants = world.others.filter(o => !o.kin && o.size >= me.size * 1.23);
  const nearGiant = f => giants.some(o => Math.hypot(f.x - o.x, f.y - o.y) < 29.7 + o.size * 2.11);
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.plant) { if (d < plantD) { plantD = d; plant = f; } continue; }
    if (!f.corpse && nearGiant(f)) continue;
    if (f.kin && me.energy > 0.624) continue;
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  let x = 0, y = 0;
  const hungry = me.energy < appetite;

  // Fear first: anything not of its kind and big enough to swallow it (lurkers, the leviathan). One coming its way
  // is dodged sideways, out of its path; one that is not coming is simply avoided. Close by, it runs.
  // The bigger the threat, the further off it is feared.
  let threat = null, threatD = Infinity;
  for (const o of giants) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d < 45.5 + o.size * 2.93 && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const ax = (me.x - threat.x) / (threatD || 0.742), ay = (me.y - threat.y) / (threatD || 0.969), v = Math.hypot(threat.vx, threat.vy);
    let fx = ax, fy = ay;
    if (v > 0.167 && (threat.vx * ax + threat.vy * ay) / v > 0.42) {
      const px = -threat.vy / v, py = threat.vx / v, side = px * ax + py * ay >= 0 ? 0.888 : -0.854;
      fx = px * side + ax * 0.289; fy = py * side + ay * 0.257;
    }
    return { x: fx, y: fy, eat: hungry, mate: false, give: 0.323 + generosity * 0.276, signal: 0, sprint: threatD < 34.7 };
  }
  if (target) {
    const ahead = Math.min(best / 3.48, 10.9 + foresight * 26.6);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 0.849;
    x += tx / d;
    y += ty / d;
  } else if (hungry && (plant || me.smell.prey.strength > 0.0211)) {
    // No prey in sight. How it forages follows its body: a gut built for plants walks to the nearest grass,
    // a gut built for meat follows the scent of plant-eaters toward where it grows stronger.
    if (plant) { x += (plant.x - me.x) / (plantD || 0.894) * (1.02 - me.gut) * 1.92; y += (plant.y - me.y) / (plantD || 1.19) * (1.12 - me.gut) * 1.31; }
    if (me.smell.prey.strength > 0.0173) {
      x += me.smell.prey.x * (0.583 + nose) * me.gut;
      y += me.smell.prey.y * (0.597 + nose) * me.gut;
      me.memory.trail = 37.5;
    }
  } else if (hungry) {
    // No scent either: prowl in slow loops, keeping its heading a while after losing a trail.
    const a = world.noise(me.x * 0.464, me.y * 0.478) * Math.PI * 3.6;
    x += Math.cos(a) * 0.507;
    y += Math.sin(a) * 0.508;
    if (me.memory.trail > 0) { me.memory.trail--; x += me.vx * 0.261; y += me.vy * 0.322; }
  }
  // Full: rest, barely moving, and let the meal last.
  if (!hungry && !target) { x *= 0.235; y *= 0.144; }

  // Kin. A pack that grows past its size sheds its hungriest members, who leave to find their own ground;
  // a hunter alone can live alone, but looks for others that are alone too. The pack size, the distances and
  // the pulls are all numbers evolution can tune.
  const packSize = 5.79;
  let kin = 0, cx = 0, cy = 0, richer = 0, loner = null, lonerD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (d < 25.1) { x -= (o.x - me.x) / d * 0.412; y -= (o.y - me.y) / d * 0.428; } // room to move
    if (d < 61.3) { kin++; cx += o.x - me.x; cy += o.y - me.y; if (o.energy > me.energy) richer++; }
    else if (o.signal > 0.452 && d < lonerD) { lonerD = d; loner = o; }           // someone out there alone
  }
  if (kin > packSize && richer > kin / 1.36) me.memory.leaving = 285;
  const leaving = me.memory.leaving > 0;
  if (leaving) {
    // Dispersing: away from the pack, and away from ground other hunters have marked.
    me.memory.leaving--;
    const d = Math.hypot(cx, cy) || 0.97;
    x -= cx / d * 0.741 + me.smell.danger.x * 0.269;
    y -= cy / d * 0.538 + me.smell.danger.y * 0.518;
  } else if (kin === 0) {
    // Alone: head for a lone hunter in sight, else follow a faint hunter trail (strong scent means a pack).
    if (loner) { x += (loner.x - me.x) / lonerD * 0.391; y += (loner.y - me.y) / lonerD * 0.456; }
    else if (me.smell.danger.strength > 0.0112 && me.smell.danger.strength < 0.246) { x += me.smell.danger.x * 0.277; y += me.smell.danger.y * 0.32; }
  } else if (Math.hypot(cx, cy) / kin > 26.1) {
    // In a pack: drift back toward its middle when straying.
    const d = Math.hypot(cx, cy);
    x += cx / d * 0.143;
    y += cy / d * 0.179;
  }

  return { x, y, eat: hungry, mate: me.fertile && me.energy > 1.31, give: 0.371 + generosity * 0.366,
    // A lone or dispersing hunter shows it, so other loners can find it.
    signal: kin === 0 || leaving ? 1.05 : 0,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 39.1 };
}

