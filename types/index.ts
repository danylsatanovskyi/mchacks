// User types
export interface User {
  id: string;
  email: string;
  username: string;
  balance: number;
  profile_pic?: string;
  group_id?: string;
  league_id?: string;
}

export interface UserProfile {
  user_id: string;
  username: string;
  profile_pic?: string;
  total_bets: number;
  total_wins: number;
  total_losses: number;
  current_pnl: number; // Profit and Loss
  greatest_win: number;
  greatest_loss: number;
  win_streak: number;
  current_balance: number;
}

// Event types
export type EventCategory = "sports" | "custom";

export interface Event {
  id: string;
  category: EventCategory;
  league?: string;
  teams?: string[];
  title: string;
  start_time?: string;
  end_time?: string;
  status: "upcoming" | "live" | "finished";
  result?: EventResult;
  // For sports events, predefined titles for future resolution checks
  resolution_options?: string[];
}

export interface EventResult {
  winner?: string;
}

// Bet types
export type BetType = "moneyline" | "n-way-moneyline" | "target-proximity";

export interface Bet {
  id: string;
  creator_id: string;
  event_id: string;
  league_id?: string;
  type: BetType;
  title: string;
  options: string[];
  stake: number;
  status: "open" | "closed" | "resolved" | "disputed";
  created_at: string;
  resolved_at?: string;
  winner?: string;
  resolution_mode?: "automatic" | "manual" | "commissioner_override";
  resolved_by?: string; // User ID who resolved it
  judge_note?: string;
  is_finished: boolean;
  did_hit?: boolean; // Whether the bet outcome was correct
}

// Wager types
export interface Wager {
  id: string;
  bet_id: string;
  user_id: string;
  selection: string; // Selected option or target value
  stake: number;
  payout?: number;
  status: "pending" | "won" | "lost";
  created_at: string;
}

// League types
export interface League {
  id: string;
  name: string;
  commissioner_id: string; // User ID of the judge/commissioner
  created_at: string;
  member_ids: string[]; // Array of user IDs
  invite_code?: string; // Optional invite code
}

export interface LeagueMember {
  user_id: string;
  username: string;
  profile_pic?: string;
  joined_at: string;
  is_commissioner: boolean;
}

// Leaderboard types
export interface LeaderboardEntry {
  user_id: string;
  username: string;
  profile_pic?: string;
  total_winnings: number;
  total_wagered: number;
  rank: number;
  delta?: number; // Change in rank
  current_pnl: number;
  win_streak: number;
  total_bets?: number;
  total_wins?: number;
  total_losses?: number;
  greatest_loss?: number;
  greatest_win?: number;
}

// Gumloop agent types
export interface AgentMessage {
  type: "roast_top" | "glaze_top" | "roast_bottom";
  message: string;
}
