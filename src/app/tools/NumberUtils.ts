export function randomize(min: number, max: number) {
  const rand = Math.random();
  const inverse = 1 - rand;
  return rand * min + inverse * max;
}
