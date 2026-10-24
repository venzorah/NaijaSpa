const NEXT_SLOTS = ["Today, 4:30 PM", "Tomorrow, 9:00 AM", "Fri, 11:00 AM", "Today, 7:00 PM"];

export function nextLabelFor(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n += id.charCodeAt(i);
  return `Next: ${NEXT_SLOTS[n % NEXT_SLOTS.length]}`;
}
