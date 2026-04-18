export const TOKEN_COLORS: readonly string[] = [
  '#e06c75',
  '#98c379',
  '#61afef',
  '#c678dd',
  '#e5c07b',
  '#56b6c2',
];

export function nextTokenColor(existingCount: number): string {
  return TOKEN_COLORS[existingCount % TOKEN_COLORS.length]!;
}
