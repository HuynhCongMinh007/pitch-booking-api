/** Values of an enum object as a tuple for z.enum(...) */
export function enumValues<T extends Record<string, string>>(
  enumObject: T,
): [T[keyof T], ...T[keyof T][]] {
  return Object.values(enumObject) as [T[keyof T], ...T[keyof T][]];
}
