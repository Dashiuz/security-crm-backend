export function filterInput(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
