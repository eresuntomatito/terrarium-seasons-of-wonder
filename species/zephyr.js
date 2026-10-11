// zephyr (S.3.1): written by claude-haiku after the mystics (S.3) collapsed, in season 36.
// lesson the stalkzoes (S.1) lasted 0.7 days, grew to 5, killed 16; then 6 starved, 0 were eaten, 0 died old. 77 plant-eaters were left.
// lesson the chromis (S.1.1) lasted 0.5 days, grew to 4, killed 9; then 4 starved, 0 were eaten, 0 died old. 305 plant-eaters were left.
// lesson the chromis (S.1.1) lasted 0.3 days, grew to 4, killed 4; then 4 starved, 0 were eaten, 0 died old. 236 plant-eaters were left.
// lesson the shroudeds (S.2) lasted 0.4 days, grew to 4, killed 4; then 4 starved, 0 were eaten, 0 died old. 126 plant-eaters were left.
// lesson the prowlers (S.2.1) lasted 0.8 days, grew to 4, killed 5; then 4 starved, 0 were eaten, 0 died old. 184 plant-eaters were left.
// lesson the prowlers (S.2.1) lasted 1.5 days, grew to 5, killed 20; then 5 starved, 0 were eaten, 0 died old. 15 plant-eaters were left.
// lesson the stalkers (S) lasted 0.3 days, grew to 6, killed 11; then 6 starved, 0 were eaten, 0 died old. 297 plant-eaters were left.
// lesson the mystics (S.3) lasted 0.3 days, grew to 4, killed 4; then 4 starved, 0 were eaten, 0 died old. 229 plant-eaters were left.
function behave(me, world) {
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.13 + me.genes[2] * 0.809, keenness = me.genes[3];

  if (!me.memory.patrolPhase) me.memory.patrolPhase = Math.random() * 6.28;
  if (!me.memory.huntSpots) me.memory.huntSpots = [];

  // Look for close prey only
  let closePreyCount = 0, closestPrey = null, closestDist = Infinity;

  for (const f of world.food) {
    if (f.plant) continue;
    if (f.kin && me.energy > 0.473) continue;

    const d = Math.hypot(f.x - me.x, f.y - me.y);

    // Only consider prey within close hunting range
    if (d < 18) {
      closePreyCount++;
      if (d < closestDist) {
        closestDist = d;
        closestPrey = f;
      }
    }
  }

  let x = 0, y = 0;

  if (closestPrey) {
    // Prey is very close: respond with moderate pursuit
    const tx = closestPrey.x - me.x;
    const ty = closestPrey.y - me.y;
    const d = Math.hypot(tx, ty) || 1;

    x += tx / d * 0.32;
    y += ty / d * 0.32;
  } else {
    // No close prey: patrol slowly in wide circle
    // This conserves energy and explores the territory
    me.memory.patrolPhase += 0.05;

    const patrolRadius = 50 + keenness * 30;
    const centerX = world.width / 2;
    const centerY = world.height / 2;

    const targetX = centerX + Math.cos(me.memory.patrolPhase) * patrolRadius;
    const targetY = centerY + Math.sin(me.memory.patrolPhase) * patrolRadius;

    const tx = targetX - me.x;
    const ty = targetY - me.y;
    const d = Math.hypot(tx, ty) || 1;

    // Very slow movement during patrol to minimize energy expenditure
    x += tx / d * 0.18;
    y += ty / d * 0.18;
  }

  // Weak kin repulsion to allow grouping
  for (const o of world.others) {
    if (!o.kin) continue;
    const d = Math.hypot(o.x - me.x, o.y - me.y);
    if (d > 0 && d < 30) {
      x -= (o.x - me.x) / d * 0.15;
      y -= (o.y - me.y) / d * 0.15;
    }
  }

  // Breed early while energy is available, before starvation sets in
  const shouldMate = me.fertile && me.energy > 1.1 && me.energy < 2.2;

  return {
    x,
    y,
    eat: me.energy < appetite,
    mate: shouldMate,
    give: 0.35 + generosity * 0.30
  };
}
