// ↺ returned in season 31.
// † extinct in season 28.
// prowler (S.2.1): written by the god after the shroudeds (S.2) collapsed, in season 28.
// lesson the stalkers (S) lasted 1.5 days, grew to 5, killed 36; then 7 starved, 0 were eaten, 0 died old. 292 plant-eaters were left.
// lesson the stalkers (S) lasted 0.8 days, grew to 5, killed 11; then 5 starved, 0 were eaten, 0 died old. 169 plant-eaters were left.
// lesson the stalkers (S) lasted 0.5 days, grew to 4, killed 3; then 4 starved, 0 were eaten, 0 died old. 112 plant-eaters were left.
// lesson the stalkzoes (S.1) lasted 0.8 days, grew to 4, killed 8; then 4 starved, 0 were eaten, 0 died old. 221 plant-eaters were left.
// lesson the stalkzoes (S.1) lasted 0.7 days, grew to 5, killed 16; then 6 starved, 0 were eaten, 0 died old. 77 plant-eaters were left.
// lesson the chromis (S.1.1) lasted 0.5 days, grew to 4, killed 9; then 4 starved, 0 were eaten, 0 died old. 305 plant-eaters were left.
// lesson the chromis (S.1.1) lasted 0.3 days, grew to 4, killed 4; then 4 starved, 0 were eaten, 0 died old. 236 plant-eaters were left.
// lesson the shroudeds (S.2) lasted 0.4 days, grew to 4, killed 4; then 4 starved, 0 were eaten, 0 died old. 126 plant-eaters were left.
function behave(me, world) {
  // Remember where we last ate
  const lastEaten = me.memory.lastEaten = me.memory.lastEaten || world.food[0];

  // Genes belong to this one creature: gene 0 is how much it gives a child, gene 1 how far ahead it aims,
  // gene 2 how full it must be before it spares the prey it touches, gene 3 how keen its eye is.
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.2 + me.genes[2] * 0.8, keenness = me.genes[3];

  // Search image: a stalker learns to spot the prey it meets often, and stops noticing prey that has
  // become rare. Its eye sharpens when prey is plentiful and fades when it is not.
  const eye = me.memory.eye = (me.memory.eye ?? 0.5) * 0.99 + 0.01 * Math.min(1, world.food.length / 4);
  const focus = Math.min(1, eye * (0.5 + keenness)) ** 2;

  let x = 0, y = 0;
  if (lastEaten && !me.memory.eaten) {
    const lastEatenDist = Math.hypot(lastEaten.x - me.x, lastEaten.y - me.y);
    const ahead = Math.min(lastEatenDist / 3, 10 + foresight * 20);
    const tx = lastEaten.x + lastEaten.vx * ahead - me.x;
    const ty = lastEaten.y + lastEaten.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1;
    x += tx / d * focus;
    y += ty / d * focus;
  } else {
    // Prowl past in slow loops.
    const a = world.noise(me.x * 0.5, me.y * 0.5) * Math.PI * 4;
    x += Math.cos(a) * 0.4 * (1 - focus);
    y += Math.sin(a) * 0.4 * (1 - focus);
  }

  return { x, y, eat: me.energy < appetite, mate: me.fertile && me.energy > 1.3, give: 0.4 + generosity * 0.3 };
}
