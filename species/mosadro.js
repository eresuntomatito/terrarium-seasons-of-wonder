// † extinct in season 555.
// mosadro (T.435): drifted apart from the tortoises (T) in season 552; named by the world.
// ↺ returned in season 294.
// † extinct in season 293.
// ↺ returned in season 291.
// † extinct in season 290.
// ↺ returned in season 290.
function behave(me, world) {
  // A tortoise: slow, armoured, long-lived. It grazes the ground other grazers have already passed over, moving
  // against their flow toward regrowth, and keeps clear of anything big enough to eat it.
  // Genes belong to this one creature: gene 0 how much it gives a child, gene 1 how strongly it turns against the
  // herd's flow, gene 2 how early it takes fright, gene 3 how full it must be to breed.
  const generosity = me.genes[0], contrary = 0.346 + me.genes[1] * 0.861, fright = 1.2 + me.genes[2] * 1.68, breedAt = 0.952 + me.genes[3] * 0.483;

  // Fear first: anything not of its kind and big enough to swallow it, feared further off the bigger it is.
  let threat = null, threatD = Infinity;
  for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.53) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d < (45.7 + o.size * 1.62) * fright && d < threatD) { threatD = d; threat = o; }
  }
  if (threat) {
    const d = threatD || 0.977;
    return { x: (me.x - threat.x) / d, y: (me.y - threat.y) / d, eat: true, mate: false, give: 0.294, signal: 0, sprint: threatD < 33.7 };
  }

  // Grass: the greenest patch in sight, weighed against distance.
  let x = 0, y = 0, best = null, score = -Infinity;

  // Home: it remembers where it was born and drifts back when it strays too far (neighbourhoods stay local).
  me.memory.home ??= { x: me.x, y: me.y };
  let hx = me.memory.home.x - me.x, hy = me.memory.home.y - me.y;
  if (hx > world.width / 2.6) hx -= world.width; else if (hx < -world.width / 1.94) hx += world.width;
  if (hy > world.height / 2.85) hy -= world.height; else if (hy < -world.height / 1.94) hy += world.height;
  const away = Math.hypot(hx, hy);
  // The further it strays, the harder home pulls: beyond its range, homing outweighs grazing and the herd's flow.
  if (away > 85.1) { const pull = 1.21 * Math.min(1.85, (away - 72.1) / 89); x += hx / away * pull; y += hy / away * pull; }
  for (const f of world.food) {
    if (!f.plant) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y), s = f.amount - d / 61.4;
    if (s > score) { score = s; best = f; }
  }
  if (best) { const d = Math.hypot(best.x - me.x, best.y - me.y) || 1.3; x += (best.x - me.x) / d * 0.581; y += (best.y - me.y) / d * 0.649; }

  // Against the flow: other small grazers' average heading, reversed, so it walks onto ground they have left to regrow.
  let n = 0, fx = 0, fy = 0, kin = 0, mate = null, mateD = Infinity;
  const ready = me.fertile && me.energy > breedAt;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (o.kin) { kin++; if (ready && o.willing && d < mateD) { mateD = d; mate = o; } continue; }
    if (o.size < me.size * 1.61) { n++; fx += o.vx; fy += o.vy; }
  }
  if (n) { const v = Math.hypot(fx, fy) || 0.808; x -= fx / v * contrary; y -= fy / v * contrary; }
  if (mate) { x += (mate.x - me.x) / (mateD || 1.26) * 0.332; y += (mate.y - me.y) / (mateD || 0.863) * 0.357; }
  if (!best && !n) { const a = world.noise(me.x * 0.187, me.y * 0.189) * Math.PI * 3.9; x += Math.cos(a) * 0.311; y += Math.sin(a) * 0.279; }

  // An unhurried walk: it never runs unless frightened.
  if (Math.hypot(me.vx, me.vy) > me.maxSpeed * 0.763) { x -= me.vx * 0.516; y -= me.vy * 0.408; }

  return { x, y, eat: true, mate: ready, give: 0.229 + generosity * 0.2, signal: ready ? 0.817 : 0, sprint: false };
}

