type BadgeColor = "green" | "neutral";

const COLOR_CLASSES: Record<BadgeColor, string> = {
  green: "bg-green-50 text-green-700",
  neutral: "bg-neutral-100 text-neutral-600",
};

export function badgeClassName(color: BadgeColor = "green"): string {
  return `rounded-full px-3 py-1 text-xs font-medium ${COLOR_CLASSES[color]}`;
}
