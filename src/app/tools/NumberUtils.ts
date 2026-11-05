export function randomize(min: number, max: number) {
  const rand = Math.random();
  const inverse = 1 - rand;
  return rand * min + inverse * max;
}

export function clamp(a: number, b: number, min: number, max: number) {
  if (isNaN(a) || isNaN(b)) {
    return 0;
  }
  let diff = Math.abs(a - b);
  if (diff < min) {
    diff = min;
  }
  if (diff > max) {
    diff = max;
  }
  return Math.sqrt(diff / (max - min));
}
