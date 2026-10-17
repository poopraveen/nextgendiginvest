import { STAGES } from "@/lib/workflow";
import { cx } from "./ui";

/** 12 survey-peg marks: filled = done, ringed = current. */
export function StageTrack({ stage, compact }: { stage: number; compact?: boolean }) {
  return (
    <ol className={cx("flex w-full items-center", compact ? "gap-1" : "gap-1.5")} aria-label={`Stage ${stage} of ${STAGES.length}`}>
      {STAGES.map((s) => {
        const done = s.n < stage;
        const current = s.n === stage;
        return (
          <li key={s.n} className="flex-1" title={`${s.n}. ${s.name}`}>
            <span
              className={cx(
                "block rounded-full",
                compact ? "h-1.5" : "h-2",
                done && "bg-survey",
                current && "bg-survey/35 ring-2 ring-survey",
                !done && !current && "bg-line",
              )}
            />
          </li>
        );
      })}
    </ol>
  );
}
