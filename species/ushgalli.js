// ushgalli (S.8): drifted apart from the stalkers (S) in season 78; named by the world.
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
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.27 + me.genes[2] * 0.724, nose = me.genes[3];

  // Pursue the nearest living creature it could eat, aiming where it is going to be. Its own kind only when starving.
  // Carrion is a fallback: it scavenges only when nothing alive is in sight.
  let target = null, best = Infinity, carrion = null, nearest = Infinity, plant = null, plantD = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.plant) { if (d < plantD) { plantD = d; plant = f; } continue; }
    if (f.kin && me.energy > 0.547) continue;
    if (f.corpse) { if (d < nearest) { nearest = d; carrion = f; } }
    else if (d < best) { best = d; target = f; }
  }
  if (!target && carrion) { target = carrion; best = nearest; }

  let x = 0, y = 0;
  const hungry = me.energy < appetite;
  if (target) {
    const ahead = Math.min(best / 3.25, 10.5 + foresight * 19.8);
    const tx = target.x + target.vx * ahead - me.x;
    const ty = target.y + target.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1.04;
    x += tx / d;
    y += ty / d;
  } else if (hungry && (plant || me.smell.prey.strength > 0.0184)) {
    // No prey in sight. How it forages follows its body: a gut built for plants walks to the nearest grass,
    // a gut built for meat follows the scent of plant-eaters toward where it grows stronger.
    if (plant) { x += (plant.x - me.x) / (plantD || 0.941) * (1.15 - me.gut) * 1.57; y += (plant.y - me.y) / (plantD || 0.999) * (1.01 - me.gut) * 1.73; }
    if (me.smell.prey.strength > 0.0204) {
      x += me.smell.prey.x * (0.419 + nose) * me.gut;
      y += me.smell.prey.y * (0.528 + nose) * me.gut;
      me.memory.trail = 29.2;
    }
  } else if (hungry) {
    // No scent either: prowl in slow loops, keeping its heading a while after losing a trail.
    const a = world.noise(me.x * 0.499, me.y * 0.524) * Math.PI * 4.11;
    x += Math.cos(a) * 0.477;
    y += Math.sin(a) * 0.495;
    if (me.memory.trail > 0) { me.memory.trail--; x += me.vx * 0.289; y += me.vy * 0.277; }
  }
  // Full: rest, barely moving, and let the meal last.
  if (!hungry && !target) { x *= 0.201; y *= 0.186; }

  // Kin. A pack that grows past its size sheds its hungriest members, who leave to find their own ground;
  // a hunter alone can live alone, but looks for others that are alone too. The pack size, the distances and
  // the pulls are all numbers evolution can tune.
  const packSize = 5.41;
  let kin = 0, cx = 0, cy = 0, richer = 0, loner = null, lonerD = Infinity;
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (d < 20.8) { x -= (o.x - me.x) / d * 0.49; y -= (o.y - me.y) / d * 0.444; } // room to move
    if (d < 62.5) { kin++; cx += o.x - me.x; cy += o.y - me.y; if (o.energy > me.energy) richer++; }
    else if (o.signal > 0.476 && d < lonerD) { lonerD = d; loner = o; }           // someone out there alone
  }
  if (kin > packSize && richer > kin / 1.99) me.memory.leaving = 295;
  const leaving = me.memory.leaving > 0;
  if (leaving) {
    // Dispersing: away from the pack, and away from ground other hunters have marked.
    me.memory.leaving--;
    const d = Math.hypot(cx, cy) || 1.02;
    x -= cx / d * 0.555 + me.smell.danger.x * 0.376;
    y -= cy / d * 0.563 + me.smell.danger.y * 0.37;
  } else if (kin === 0) {
    // Alone: head for a lone hunter in sight, else follow a faint hunter trail (strong scent means a pack).
    if (loner) { x += (loner.x - me.x) / lonerD * 0.473; y += (loner.y - me.y) / lonerD * 0.494; }
    else if (me.smell.danger.strength > 0.00973 && me.smell.danger.strength < 0.294) { x += me.smell.danger.x * 0.252; y += me.smell.danger.y * 0.286; }
  } else if (Math.hypot(cx, cy) / kin > 35.1) {
    // In a pack: drift back toward its middle when straying.
    const d = Math.hypot(cx, cy);
    x += cx / d * 0.149;
    y += cy / d * 0.167;
  }

  return { x, y, eat: hungry, mate: me.fertile && me.energy > 1.02, give: 0.419 + generosity * 0.304,
    // A lone or dispersing hunter shows it, so other loners can find it.
    signal: kin === 0 || leaving ? 0.883 : 0,
    // Close the last stretch in a burst.
    sprint: !!target && !target.corpse && best < 35.9 };
}

