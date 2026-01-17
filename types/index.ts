// User types
export interface User {
  id: string;
  email: string;
  username: string;
  balance: number;
  group_id?: string;
}

// Event types
export interface Event {
  id: string;
  league: string;
  teams: string[];
  start_time: string;
  status: "upcoming" | "live" | "finished";
  result?: EventResult;
}

export interface EventResult {
  winner?: string;
  rankings?: string[]; // For ranked events
}

// Bet types
export type BetType = "binary" | "ranked";

export interface Bet {
  id: string;
  creator_id: string;
  event_id: string;
  group_id?: string;
  type: BetType;
  title: string;
  options: string[];
  stake: number;
  status: "open" | "closed" | "resolved";
  created_at: string;
  resolved_at?: string;
  winner?: string;
  rankings?: string[]; // For ranked bets
  resolution_mode?: "automatic" | "manual";
  judge_note?: string;
}

// Wager types
export interface Wager {
  id: string;
  bet_id: string;
  user_id: string;
  selection: string; // For binary: "option1" or "option2"
  rankings?: string[]; // For ranked: ["1st", "2nd", "3rd"]
  stake: number;
  payout?: number;
  status: "pending" | "won" | "lost";
  created_at: string;
}

// Leaderboard types
export interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_winnings: number;
  total_wagered: number;
  rank: number;
  delta?: number; // Change in rank
}

// Gumloop agent types
export interface AgentMessage {
  type: "roast_top" | "glaze_top" | "roast_bottom";
  message: string;
}
