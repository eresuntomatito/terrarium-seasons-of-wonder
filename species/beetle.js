// † extinct in season 100.
// † extinct in season 99.
// † extinct in season 99.
// † extinct in season 99.
// † extinct in season 98.
// † extinct in season 98.
// † extinct in season 98.
// † extinct in season 97.
// † extinct in season 97.
// † extinct in season 97.
// † extinct in season 96.
// † extinct in season 96.
// † extinct in season 96.
// † extinct in season 95.
// † extinct in season 95.
// † extinct in season 95.
// † extinct in season 94.
// † extinct in season 94.
// † extinct in season 93.
// † extinct in season 93.
// † extinct in season 93.
// † extinct in season 92.
// † extinct in season 92.
// † extinct in season 92.
// † extinct in season 91.
// † extinct in season 91.
// † extinct in season 91.
// † extinct in season 90.
// † extinct in season 90.
// † extinct in season 90.
// † extinct in season 89.
// † extinct in season 89.
// † extinct in season 89.
// † extinct in season 88.
// † extinct in season 88.
// † extinct in season 88.
// † extinct in season 87.
// † extinct in season 87.
// † extinct in season 78.
// † extinct in season 54.
// † extinct in season 53.
// † extinct in season 52.
function behave(me, world) {
  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how eagerly it courts,
  // gene 2 how early it takes fright.
  const generosity = me.genes[0], ardour = me.genes[1], fright = 25 + me.genes[2] * 35;

  // Beetles live on the dead. Head for the nearest corpse; failing that, the nearest plant.
  let target = null, best = Infinity, carrion = false;
  for (const f of world.food) {
    if (f.corpse || (!carrion && f.plant)) {
      const d = Math.hypot(f.x - me.x, f.y - me.y);
      if ((f.corpse && !carrion) || d < best) { best = d; target = f; carrion = carrion || !!f.corpse; }
    }
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

  // Flee anything big enough to eat it; when well fed, look for a willing partner of its own kind.
  const ready = me.fertile && me.energy > 0.8;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.2 && d < fright) {
      x -= (o.x - me.x) / d * 2;
      y -= (o.y - me.y) / d * 2;
    } else if (ready && o.kin && o.willing) {
      x += (o.x - me.x) / d * (0.4 + ardour);
      y += (o.y - me.y) / d * (0.4 + ardour);
    }
  }

  // Beetles never attack the living: they only eat what they touch when it is already dead, or a plant.
  return { x, y, mate: ready, give: 0.25 + generosity * 0.3, signal: ready ? 1 : 0 };
}
