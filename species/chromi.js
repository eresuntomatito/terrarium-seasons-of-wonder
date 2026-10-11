// ↺ returned in season 25.
// † extinct in season 24.
// chromi (S.1.1): written by the god after the stalkzoes (S.1) collapsed, in season 24.
// lesson the stalkers (S) lasted 1.5 days, grew to 5, killed 36; then 7 starved, 0 were eaten, 0 died old. 292 plant-eaters were left.
// lesson the stalkers (S) lasted 0.8 days, grew to 5, killed 11; then 5 starved, 0 were eaten, 0 died old. 169 plant-eaters were left.
// lesson the stalkers (S) lasted 0.5 days, grew to 4, killed 3; then 4 starved, 0 were eaten, 0 died old. 112 plant-eaters were left.
// lesson the stalkzoes (S.1) lasted 0.8 days, grew to 4, killed 8; then 4 starved, 0 were eaten, 0 died old. 221 plant-eaters were left.
// lesson the stalkzoes (S.1) lasted 0.7 days, grew to 5, killed 16; then 6 starved, 0 were eaten, 0 died old. 77 plant-eaters were left.
function behave(me, world) {
  const generosity = me.genes[0], foresight = me.genes[1], appetite = 1.2 + me.genes[2] * 0.8, keenness = me.genes[3];

  const eye = me.memory.eye = (me.memory.eye ?? 0.5) * 0.99 + 0.01 * Math.min(1, world.food.length / 4);
  const focus = Math.min(1, eye * (0.5 + keenness)) ** 2;

  let x = 0, y = 0;
  if (world.food.length > 0) {
    const food = world.food[Math.floor(Math.random() * world.food.length)];
    const ahead = Math.min(Math.hypot(food.x - me.x, food.y - me.y) / 2, 10 + foresight * 20);
    const tx = food.x + food.vx * ahead - me.x;
    const ty = food.y + food.vy * ahead - me.y;
    const d = Math.hypot(tx, ty) || 1;
    x += tx / d * focus;
    y += ty / d * focus;
  }

  const a = world.noise(me.x * 0.5, me.y * 0.5) * Math.PI * 4;
  x += Math.cos(a) * 0.4 * (1 - focus);
  y += Math.sin(a) * 0.4 * (1 - focus);

  const dist = Math.hypot(me.x - x, me.y - y);
  const angle = Math.atan2(y - me.y, x - me.x);

  const direction = Math.random() * 2 * Math.PI;
  const spreadAngle = 0.1 * Math.PI;

  x += Math.cos(direction) * spreadAngle;
  y += Math.sin(direction) * spreadAngle;

  return { x, y, eat: me.energy < appetite, mate: me.fertile && me.energy > 1.3, give: 0.4 + generosity * 0.3 };
}
