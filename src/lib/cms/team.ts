export const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

/** 7 -> "Seven people" (digits past twenty) */
export function teamLine(n: number) {
  const word = NUMBER_WORDS[n] ?? String(n);
  return `${word[0].toUpperCase()}${word.slice(1)} ${n === 1 ? "person" : "people"}`;
}
