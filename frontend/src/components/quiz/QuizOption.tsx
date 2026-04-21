import { cn } from "@/lib/utils";

type Props = {
  label: string;
  selected: boolean;
  onClick: () => void;
  index: number;
};

export function QuizOption({ label, selected, onClick, index }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full text-left px-6 py-5 rounded-xl border transition-all duration-300",
        "flex items-center justify-between gap-4",
        "hover:border-blood-soft hover:bg-surface-elevated",
        selected ? "border-blood bg-surface-elevated glow-blood" : "border-border bg-surface/60",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span
        className={cn(
          "text-base md:text-lg font-medium transition-colors",
          selected ? "text-foreground" : "text-foreground/85",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
          selected ? "border-blood bg-blood" : "border-border group-hover:border-blood-soft",
        )}
      >
        {selected && (
          <svg
            className="h-3 w-3 text-background"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
    </button>
  );
}
