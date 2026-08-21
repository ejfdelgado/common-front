export function shuffleInPlace<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // random index 0..i
    [array[i], array[j]] = [array[j], array[i]]; // swap
  }
}

export function map2KeyValueArray<T>(data: { [key: string]: T }) {
  return Object.keys(data).map((key) => {
    return {
      key: key,
      value: data[key],
    };
  });
}

export function keyValueArray2Map<T>(data: { key: string; value: T }[]) {
  const map: { [key: string]: T } = {};
  data.forEach((element) => {
    map[element.key] = element.value;
  });
  return map;
}
