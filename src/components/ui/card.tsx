import type { HTMLAttributes } from "react";

type CardPadding = "none" | "sm" | "md" | "lg";

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: CardPadding;
};

export function Card({ padding = "md", className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white shadow-sm ${PADDING_CLASSES[padding]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}
