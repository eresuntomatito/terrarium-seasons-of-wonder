// † extinct in season 436.
// ↺ returned in season 434.
// † extinct in season 433.
// ↺ returned in season 430.
// † extinct in season 430.
// † extinct in season 429.
// † extinct in season 428.
// † extinct in season 426.
// † extinct in season 425.
// † extinct in season 424.
// † extinct in season 423.
// ↺ returned in season 423.
// † extinct in season 423.
// ↺ returned in season 423.
// † extinct in season 422.
// ↺ returned in season 422.
// † extinct in season 411.
// † extinct in season 410.
// † extinct in season 409.
// † extinct in season 409.
// † extinct in season 406.
// † extinct in season 406.
// † extinct in season 404.
// † extinct in season 388.
// † extinct in season 388.
// † extinct in season 387.
// † extinct in season 378.
// † extinct in season 377.
// † extinct in season 342.
// † extinct in season 314.
// † extinct in season 313.
// † extinct in season 308.
// † extinct in season 307.
// † extinct in season 307.
// † extinct in season 306.
// † extinct in season 305.
// † extinct in season 305.
// † extinct in season 305.
// † extinct in season 304.
// † extinct in season 304.
// † extinct in season 301.
// † extinct in season 301.
// † extinct in season 299.
// † extinct in season 299.
// † extinct in season 298.
// † extinct in season 298.
// † extinct in season 297.
// † extinct in season 297.
// † extinct in season 296.
// † extinct in season 296.
// † extinct in season 295.
// † extinct in season 295.
// † extinct in season 295.
// † extinct in season 294.
// † extinct in season 289.
// † extinct in season 289.
// † extinct in season 289.
// † extinct in season 285.
// † extinct in season 192.
// † extinct in season 180.
// † extinct in season 171.
// † extinct in season 167.
// † extinct in season 164.
// † extinct in season 158.
// † extinct in season 154.
// † extinct in season 142.
// † extinct in season 138.
// † extinct in season 136.
// † extinct in season 135.
// † extinct in season 135.
// † extinct in season 134.
// † extinct in season 134.
// † extinct in season 130.
// † extinct in season 128.
// † extinct in season 128.
// † extinct in season 126.
// † extinct in season 123.
// † extinct in season 120.
// † extinct in season 101.
// † extinct in season 99.
// † extinct in season 95.
// † extinct in season 93.
// † extinct in season 91.
// † extinct in season 90.
// † extinct in season 88.
// † extinct in season 85.
// † extinct in season 83.
// † extinct in season 81.
// † extinct in season 79.
// † extinct in season 78.
// † extinct in season 77.
// † extinct in season 57.
// † extinct in season 55.
// † extinct in season 54.
// † extinct in season 54.
// † extinct in season 53.
// † extinct in season 53.
// † extinct in season 36.
// † extinct in season 9.
// † extinct in season 9.
// † extinct in season 7.
// † extinct in season 6.
// † extinct in season 6.
// † extinct in season 5.
// † extinct in season 5.
// † extinct in season 4.
// † extinct in season 3.
// † extinct in season 2.
// † extinct in season 2.
// † extinct in season 1.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how eagerly it courts,
  // gene 2 how early it takes fright.
  const generosity = me.genes[0], ardour = me.genes[1], fright = 25 + me.genes[2] * 35;

  // Beetles live on the dead and on dung. Head for the nearest corpse; failing that, the nearest herd animal
  // (its droppings), and only then a plant.
  let target = null, best = Infinity, carrion = false;
  for (const f of world.food) {
    if (!f.corpse) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; carrion = true; }
  }
  if (!target) for (const o of world.others) {
    if (o.kin || o.size < me.size * 1.2) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d < best) { best = d; target = o; }
  }
  if (!target) for (const f of world.food) {
    if (!f.plant) continue;
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  let x = 0, y = 0;
  if (target) {
    x += (target.x - me.x) / (best || 1);
    y += (target.y - me.y) / (best || 1);
  } else {
    // Nothing to eat in sight: crawl slowly along the noise field.
    const a = world.noise(me.x, me.y) * Math.PI * 2;
    x += Math.cos(a) * 0.4;
    y += Math.sin(a) * 0.4;
  }

  // Toxic and bright, beetles have little to fear: they only shy from giants. When well fed they seek a willing mate.
  const ready = me.fertile && me.energy > 0.8;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 8 && d < fright) {
      x -= (o.x - me.x) / d * 2;
      y -= (o.y - me.y) / d * 2;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.4 + ardour);
      y += (o.y - me.y) / d * (0.4 + ardour);
    }
  }

  // Beetles never attack the living: they only eat what they touch when it is already dead, or a plant.
  return { x, y, mate: ready, give: 0.25 + generosity * 0.3, signal: ready ? 1 : 0,
    sprint: world.others.some(o => !o.kin && o.size >= me.size * 8 && Math.hypot(o.x - me.x, o.y - me.y) < fright * 0.5) };
}
