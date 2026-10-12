// † extinct in season 78.
// aurora (B.1): branched from the beetles (B) in season 78, written by claude-haiku.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1], fright = 25.1 + me.genes[2] * 31.2;

  let corpseTarget = null, plantTarget = null;
  let corpseDist = Infinity, plantDist = Infinity;

  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (f.corpse && d < corpseDist) { corpseDist = d; corpseTarget = f; }
    if (f.plant && d < plantDist) { plantDist = d; plantTarget = f; }
  }

  let x = 0, y = 0;
  let touchingCorpse = false;

  if (corpseTarget) {
    const dx = corpseTarget.x - me.x;
    const dy = corpseTarget.y - me.y;
    const d = Math.hypot(dx, dy);

    if (d < me.size * 2.5) {
      touchingCorpse = true;
      // Orbit obsessively around corpse
      const angle = Math.atan2(dy, dx);
      const orbitDir = angle + Math.PI / 2;
      x += Math.cos(orbitDir) * 0.6;
      y += Math.sin(orbitDir) * 0.6;
    } else {
      // Rush toward corpse
      x += dx / (d || 1) * 1.1;
      y += dy / (d || 1) * 1.1;
    }
  } else if (plantTarget) {
    // Halfhearted plant seeking
    x += (plantTarget.x - me.x) / (plantDist || 1) * 0.25;
    y += (plantTarget.y - me.y) / (plantDist || 0.847) * 0.25;
  } else {
    // Slow wander when no corpse in sight
    const a = world.noise(me.x, me.y) * Math.PI * 2.1;
    x += Math.cos(a) * 0.35;
    y += Math.sin(a) * 0.3;
  }

  const ready = me.fertile && me.energy > 0.726;

  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;

    if (!o.kin && o.size >= me.size * 1.02 && d < fright) {
      x -= (o.x - me.x) / d * 1.92;
      y -= (o.y - me.y) / d * 1.83;
    } else if (ready && o.kin && o.willing && touchingCorpse) {
      // Only mate near corpses
      x += (o.x - me.x) / d * (0.302 + ardour);
      y += (o.y - me.y) / d * (0.366 + ardour);
    }
  }

  return { x, y, mate: ready && touchingCorpse, give: 0.164 + generosity * 0.228, signal: touchingCorpse ? 0.92 : 0 };
}
