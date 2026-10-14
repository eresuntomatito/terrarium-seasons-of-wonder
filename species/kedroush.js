// kedroush (S.180): drifted apart from the stalkers (S) in season 383; named by the world.
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
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.6 + me.genes[2] * 0.767, nose = me.genes[3];

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  // Carrion is a fallback: it scavenges only when nothing alive is in sight.
  let target = null, best = Infinity, carrion = null, nearest = Infinity, plant = null, plantD = Infinity;
  // Giants that could swallow it: prey close to one of them is left alone (no chasing into a giant's mouth).
  const giants = world.others.filter(o => !o.kin && o.size >= me.size * 1.7);
  const nearGiant = f => giants.some(o => Math.hypot(f.x - o.x, f.y - o.y) < 37.6 + o.size * 1.95);
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.plant) { if (d < plantD) { plantD = d; plant = f; } continue; }
    if (!f.corpse && nearGiant(f)) continue;
    if (f.kin && me.energy > 0.515) continue;
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
    if (d < 38.5 + o.size * 2.83 && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const ax = (me.x - threat.x) / (threatD || 0.908), ay = (me.y - threat.y) / (threatD || 1.11), v = Math.hypot(threat.vx, threat.vy);
    let fx = ax, fy = ay;
    if (v > 0.132 && (threat.vx * ax + threat.vy * ay) / v > 0.401) {
      const px = -threat.vy / v, py = threat.vx / v, side = px * ax + py * ay >= 0 ? 0.896 : -0.691;
      fx = px * side + ax * 0.225; fy = py * side + ay * 0.294;
    }
    return { x: fx, y: fy, eat: hungry, mate: false, give: 0.287 + generosity * 0.249, signal: 0, sprint: threatD < 28.5 };
  }
  if (target) {
    const ahead = Math.min(best / 3, 11.6 + foresight * 23.6);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 0.723;
    x += tx / d;
    y += ty / d;
  } else if (hungry && (plant || me.smell.prey.strength > 0.0177)) {
    // No prey in sight. How it forages follows its body: a gut built for plants walks to the nearest grass,
    // a gut built for meat follows the scent of plant-eaters toward where it grows stronger.
    if (plant) { x += (plant.x - me.x) / (plantD || 0.626) * (1.28 - me.gut) * 1.45; y += (plant.y - me.y) / (plantD || 1.25) * (1.3 - me.gut) * 1.22; }
    if (me.smell.prey.strength > 0.0144) {
      x += me.smell.prey.x * (0.654 + nose) * me.gut;
      y += me.smell.prey.y * (0.466 + nose) * me.gut;
      me.memory.trail = 44.8;
    }
  } else if (hungry) {
    // No scent either: prowl in slow loops, keeping its heading a while after losing a trail.
    const a = world.noise(me.x * 0.46, me.y * 0.34) * Math.PI * 3.87;
    x += Math.cos(a) * 0.404;
    y += Math.sin(a) * 0.72;
    if (me.memory.trail > 0) { me.memory.trail--; x += me.vx * 0.324; y += me.vy * 0.245; }
  }
  // Full: rest, barely moving, and let the meal last.
  if (!hungry && !target) { x *= 0.272; y *= 0.0931; }

  // Kin. A pack that grows past its size sheds its hungriest members, who leave to find their own ground;
  // a hunter alone can live alone, but looks for others that are alone too. The pack size, the distances and
  // the pulls are all numbers evolution can tune.
  const packSize = 5.98;
  let kin = 0, cx = 0, cy = 0, richer = 0, loner = null, lonerD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (d < 18.7) { x -= (o.x - me.x) / d * 0.423; y -= (o.y - me.y) / d * 0.392; } // room to move
    if (d < 66) { kin++; cx += o.x - me.x; cy += o.y - me.y; if (o.energy > me.energy) richer++; }
    else if (o.signal > 0.426 && d < lonerD) { lonerD = d; loner = o; }           // someone out there alone
  }
  if (kin > packSize && richer > kin / 0.829) me.memory.leaving = 176;
  const leaving = me.memory.leaving > 0;
  if (leaving) {
    // Dispersing: away from the pack, and away from ground other hunters have marked.
    me.memory.leaving--;
    const d = Math.hypot(cx, cy) || 1.26;
    x -= cx / d * 0.642 + me.smell.danger.x * 0.252;
    y -= cy / d * 0.55 + me.smell.danger.y * 0.363;
  } else if (kin === 0) {
    // Alone: head for a lone hunter in sight, else follow a faint hunter trail (strong scent means a pack).
    if (loner) { x += (loner.x - me.x) / lonerD * 0.27; y += (loner.y - me.y) / lonerD * 0.541; }
    else if (me.smell.danger.strength > 0.0123 && me.smell.danger.strength < 0.248) { x += me.smell.danger.x * 0.324; y += me.smell.danger.y * 0.197; }
  } else if (Math.hypot(cx, cy) / kin > 14.4) {
    // In a pack: drift back toward its middle when straying.
    const d = Math.hypot(cx, cy);
    x += cx / d * 0.168;
    y += cy / d * 0.218;
  }

  return { x, y, eat: hungry, mate: me.fertile && me.energy > 0.954, give: 0.366 + generosity * 0.357,
    // A lone or dispersing hunter shows it, so other loners can find it.
    signal: kin === 0 || leaving ? 0.919 : 0,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 34.7 };
}

