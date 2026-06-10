// ─────────────────────────────────────────────────────────────
// HELPER UTILITIES
// ─────────────────────────────────────────────────────────────

export function rnd(min, max) {
  return min + Math.random() * (max - min);
}

export function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function moveEntity(entity, map, dx, dy, tileSize, isSolid) {
  const newX = entity.x + dx;
  const newY = entity.y + dy;

  const tx1 = Math.floor((newX - entity.w / 2) / tileSize);
  const tx2 = Math.floor((newX + entity.w / 2) / tileSize);
  const ty1 = Math.floor((newY - entity.h / 2) / tileSize);
  const ty2 = Math.floor((newY + entity.h / 2) / tileSize);

  let canMoveX = true;
  let canMoveY = true;

  // Check X movement
  if (dx !== 0) {
    const checkX = dx > 0 ? tx2 : tx1;
    for (let ty = ty1; ty <= ty2; ty++) {
      if (isSolid(map, checkX, ty)) {
        canMoveX = false;
        break;
      }
    }
  }

  // Check Y movement
  if (dy !== 0) {
    const checkY = dy > 0 ? ty2 : ty1;
    for (let tx = tx1; tx <= tx2; tx++) {
      if (isSolid(map, tx, checkY)) {
        canMoveY = false;
        break;
      }
    }
  }

  if (canMoveX) entity.x = newX;
  if (canMoveY) entity.y = newY;
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
