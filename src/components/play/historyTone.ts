/** Color language used by crash boards: cool for low, violet for mid, gold for high. */
export function historyClass(bp: number): string {
  if (bp < 200) return "text-[#6ec8ff]";
  if (bp < 1000) return "text-[#c46bff]";
  return "text-[#f0c14a]";
}
