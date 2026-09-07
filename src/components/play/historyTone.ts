/** Color language used by crash boards: cool for low, violet for mid, gold for high. */
export function historyClass(bp: number): string {
  if (bp < 200) return "text-[#6f9cff]";
  if (bp < 1000) return "text-[#b07cff]";
  return "text-[#ff4dd2]";
}
