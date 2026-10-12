// ↺ returned in season 94.
// † extinct in season 94.
// ↺ returned in season 94.
// † extinct in season 93.
// ↺ returned in season 93.
// † extinct in season 93.
// ↺ returned in season 93.
// † extinct in season 93.
// ↺ returned in season 93.
// † extinct in season 92.
// ↺ returned in season 92.
// † extinct in season 92.
// ↺ returned in season 92.
// † extinct in season 92.
// ↺ returned in season 92.
// † extinct in season 91.
// ↺ returned in season 91.
// † extinct in season 91.
// ↺ returned in season 91.
// † extinct in season 91.
// ↺ returned in season 91.
// † extinct in season 90.
// ↺ returned in season 90.
// † extinct in season 90.
// ↺ returned in season 90.
// † extinct in season 89.
// ↺ returned in season 89.
// † extinct in season 89.
// ↺ returned in season 89.
// † extinct in season 89.
// ↺ returned in season 89.
// † extinct in season 88.
// ↺ returned in season 88.
// † extinct in season 88.
// ↺ returned in season 88.
// † extinct in season 88.
// ↺ returned in season 88.
// † extinct in season 87.
// ↺ returned in season 87.
// † extinct in season 87.
// ↺ returned in season 87.
// † extinct in season 87.
// ↺ returned in season 87.
// † extinct in season 86.
// ↺ returned in season 86.
// † extinct in season 86.
// ↺ returned in season 86.
// † extinct in season 86.
// ↺ returned in season 86.
// † extinct in season 85.
// ↺ returned in season 85.
// † extinct in season 85.
// ↺ returned in season 85.
// † extinct in season 84.
// ↺ returned in season 84.
// † extinct in season 84.
// ↺ returned in season 84.
// † extinct in season 84.
// ↺ returned in season 84.
// † extinct in season 83.
// ↺ returned in season 83.
// † extinct in season 83.
// ↺ returned in season 83.
// † extinct in season 82.
// ↺ returned in season 82.
// † extinct in season 82.
// ↺ returned in season 82.
// † extinct in season 81.
// ↺ returned in season 81.
// † extinct in season 81.
// ↺ returned in season 81.
// † extinct in season 80.
// ↺ returned in season 80.
// † extinct in season 80.
// ↺ returned in season 79.
// † extinct in season 79.
// ↺ returned in season 79.
// † extinct in season 78.
// ↺ returned in season 78.
// † extinct in season 78.
// ↺ returned in season 78.
// † extinct in season 77.
// ↺ returned in season 72.
// † extinct in season 72.
// ↺ returned in season 71.
// † extinct in season 71.
// ↺ returned in season 70.
// † extinct in season 70.
// ↺ returned in season 67.
// † extinct in season 67.
// ↺ returned in season 66.
// † extinct in season 66.
// ↺ returned in season 66.
// † extinct in season 65.
// ↺ returned in season 64.
// † extinct in season 64.
// ↺ returned in season 64.
// † extinct in season 64.
// ↺ returned in season 64.
// † extinct in season 63.
// ↺ returned in season 63.
// † extinct in season 62.
// ↺ returned in season 62.
// † extinct in season 62.
// ↺ returned in season 61.
// † extinct in season 61.
// ↺ returned in season 61.
// † extinct in season 60.
// ↺ returned in season 60.
// † extinct in season 60.
// ↺ returned in season 60.
// † extinct in season 59.
// ↺ returned in season 59.
// † extinct in season 58.
// ↺ returned in season 57.
// † extinct in season 57.
// ↺ returned in season 57.
// † extinct in season 57.
// ↺ returned in season 56.
// † extinct in season 55.
// ↺ returned in season 55.
// † extinct in season 55.
// globulu (W.1.10): held by the god after the galysathus (W.1) in season 49, written by claude-haiku.
function behave(me, world) {
  const generosity = me.genes[0], ardour = me.genes[1],
    fright = 19.5 + me.genes[2] * 31.6;

  // Find the closest food.
  let target = null, best = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  let x = 0, y = 0;
  if (target) {
    x += (target.x - me.x) / best;
    y += (target.y - me.y) / best;
  } else {
    // Nothing nearby: drift along the noise field.
    const a = world.noise(me.x, me.y) * Math.PI * 3.45;
    x += Math.cos(a) * 0.709;
    y += Math.sin(a) * 0.686;
  }

  // Flee anything big enough to eat it. When well fed, look for a willing partner;
  // otherwise ATTRACT to kin for clustering (inverted from parent's repulsion).
  const ready = me.fertile && me.energy > 0.487;
  for (const o of world.others) {
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d === 0) continue;
    if (!o.kin && o.size >= me.size * 1.13 && d < fright) {
      x -= (o.x - me.x) / d * 1.57;
      y -= (o.y - me.y) / d * 2.71;
    } else if (o.kin) {
      // Kin clustering: attract to all kin, stronger pull to willing mates.
      if (ready && o.willing) {
        x += (o.x - me.x) / d * (0.544 + ardour);
        y += (o.y - me.y) / d * (0.259 + ardour);
      } else {
        // Mild attraction to other kin forms protective group.
        x += (o.x - me.x) / d * 0.22;
        y += (o.y - me.y) / d * 0.22;
      }
    } else if (d < 11) {
      x -= (o.x - me.x) / d;
      y -= (o.y - me.y) / d;
    }
  }

  return { x, y, mate: ready, give: 0.0769 + generosity * 0.44, signal: ready ? 0.788 : 0 };
}
