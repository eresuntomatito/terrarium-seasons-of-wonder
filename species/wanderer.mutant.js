function behave(me, world) {
  // Find the closest food.
  let target = null, best = Infinity;
  for (const f of world.food) {
    const d = Math.hypot(f.x - me.x, f.y - me.y);
    if (d < best) { best = d; target = f; }
  }

  let x = 0, y = 0;

  if (target && best < 120) {
    // Follow the noise field but add random variation.
    const a = world.noise(me.x, me.y) * Math.PI * 2;
    x += Math.cos(a) * 0.7 + Math.random() * 0.05 + Math.random() * 0.05; // Increased randomness
    y += Math.sin(a) * 0.7 + Math.random() * 0.05 + Math.random() * 0.05; // Increased randomness
  } else {
    // Follow the noise field but add a more complex algorithm to choose the direction.
    const noise = world.noise(me.x, me.y);
    x += noise * 0.7 + Math.random() * 0.05; // Increased intensity
    y += noise * 0.7 + Math.random() * 0.05; // Increased intensity

    // Add random variation to the direction
    x += Math.random() * 0.1;
    y += Math.random() * 0.1;
  }

  // Change hue slightly based on energy and age.
  const hueShift = (me.energy * 0.01 + me.age / 1000) % 360;
  const hue = me.hue + hueShift % 360;

  return { x, y, hue, energy: me.energy * 0.95 };
}
