import type { Holding } from "./finance";
import type { Settings, Vote } from "./types";

export interface Tally {
  yes: number; // fraction of total ownership
  no: number;
  abstain: number;
  notVoted: number;
  needed: number; // fraction needed
  passed: boolean;
  decided: boolean; // outcome can no longer change
}

/**
 * Votes are weighted by ownership and measured against TOTAL ownership, not just votes cast,
 * so a resolution cannot pass on low turnout.
 *   Ordinary: yes must be MORE than ordinaryThreshold %.
 *   Special:  yes must be AT LEAST specialThreshold %.
 */
export function tally(vote: Vote, holdings: Holding[], s: Pick<Settings, "ordinaryThreshold" | "specialThreshold">): Tally {
  let yes = 0, no = 0, abstain = 0, notVoted = 0;
  for (const h of holdings) {
    const b = vote.ballots[h.partnerId];
    if (b === "yes") yes += h.share;
    else if (b === "no") no += h.share;
    else if (b === "abstain") abstain += h.share;
    else notVoted += h.share;
  }
  const eps = 1e-9;
  const needed = (vote.kind === "special" ? s.specialThreshold : s.ordinaryThreshold) / 100;
  const passed = vote.kind === "special" ? yes + eps >= needed : yes > needed + eps;
  // Fails for sure once yes + everyone who has not voted still cannot reach the bar.
  const maxYes = yes + notVoted;
  const cannotPass = vote.kind === "special" ? maxYes + eps < needed : maxYes <= needed + eps;
  return { yes, no, abstain, notVoted, needed, passed, decided: passed || cannotPass };
}

export function maintenanceNeedsVote(estimate: number, s: Pick<Settings, "autoApproveLimit">) {
  return estimate > s.autoApproveLimit;
}
