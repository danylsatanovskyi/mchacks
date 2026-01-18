import { Bet, Event, Wager, LeaderboardEntry, User, League } from "../types";

// Backend API base URL - update this with your FastAPI server URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

// Auth token - will be set from Auth0
let authToken: string | null = null;
let currentUserId: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const setCurrentUserId = (userId: string | null) => {
  currentUserId = userId;
};

const fetchWithAuth = async (endpoint: string, options: RequestInit = {}, userId?: string) => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  // Send user ID in header (backend expects X-User-Id)
  const userIdToSend = userId || currentUserId;
  if (userIdToSend) {
    headers["X-User-Id"] = userIdToSend;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch (e) {
      // If response is not JSON, use status text
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

// Health check
export const healthCheck = async (): Promise<{ status: string }> => {
  return fetchWithAuth("/health");
};

// Events
export const getEvents = async (params?: {
  league?: string;
  status?: string;
}): Promise<Event[]> => {
  const queryParams = new URLSearchParams();
  if (params?.league) queryParams.append("league", params.league);
  if (params?.status) queryParams.append("status", params.status);

  const query = queryParams.toString();
  return fetchWithAuth(`/events${query ? `?${query}` : ""}`);
};

export const refreshEvents = async (): Promise<Event[]> => {
  return fetchWithAuth("/events/refresh", { method: "POST" });
};

// Bets
export const getBets = async (params?: {
  group_id?: string;
  status?: string;
}): Promise<Bet[]> => {
  const queryParams = new URLSearchParams();
  if (params?.group_id) queryParams.append("group_id", params.group_id);
  if (params?.status) queryParams.append("status", params.status);

  const query = queryParams.toString();
  return fetchWithAuth(`/bets${query ? `?${query}` : ""}`);
};

export const createBet = async (betData: {
  event_id: string;
  group_id?: string;
  type: "moneyline" | "n-way-moneyline" | "target-proximity";
  title: string;
  options: string[];
  stake: number;
}): Promise<Bet> => {
  // Map group_id to league_id for backend
  const { group_id, ...rest } = betData;
  const payload = group_id ? { ...rest, league_id: group_id } : rest;
  return fetchWithAuth("/bets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const resolveBet = async (
  betId: string,
  resolution: {
    winner?: string;
    rankings?: string[];
    mode: "automatic" | "manual";
    note?: string;
  }
): Promise<Bet> => {
  return fetchWithAuth(`/bets/${betId}/resolve`, {
    method: "POST",
    body: JSON.stringify(resolution),
  });
};

// Wagers
export const createWager = async (wagerData: {
  bet_id: string;
  selection: string;
  rankings?: string[];
  stake: number;
}, userId?: string): Promise<Wager> => {
  return fetchWithAuth("/wagers", {
    method: "POST",
    body: JSON.stringify(wagerData),
  }, userId);
};

export const getBetWagers = async (betId: string): Promise<Wager[]> => {
  return fetchWithAuth(`/bets/${betId}/wagers`);
};

export const getWagers = async (params?: {
  bet_id?: string;
  group_id?: string;
}): Promise<Wager[]> => {
  const queryParams = new URLSearchParams();
  if (params?.bet_id) queryParams.append("bet_id", params.bet_id);
  if (params?.group_id) queryParams.append("group_id", params.group_id);

  const query = queryParams.toString();
  return fetchWithAuth(`/wagers${query ? `?${query}` : ""}`);
};

// Leaderboard
export const getLeaderboard = async (params?: {
  group_id?: string;
}): Promise<LeaderboardEntry[]> => {
  const queryParams = new URLSearchParams();
  if (params?.group_id) queryParams.append("group_id", params.group_id);

  const query = queryParams.toString();
  return fetchWithAuth(`/leaderboard${query ? `?${query}` : ""}`);
};

// User
export const getCurrentUser = async (userId?: string): Promise<User> => {
  return fetchWithAuth("/users/me", {}, userId);
};

export const updateUserProfile = async (profileData: {
  username?: string;
  profile_pic?: string;
}): Promise<User> => {
  return fetchWithAuth("/users/me", {
    method: "PATCH",
    body: JSON.stringify(profileData),
  });
};

export const getUser = async (userId: string): Promise<User> => {
  return fetchWithAuth(`/users/${userId}`);
};

// League
export const updateLeagueName = async (
  leagueId: string,
  name: string
): Promise<League> => {
  return fetchWithAuth(`/leagues/${leagueId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
};

export const transferCommissioner = async (
  leagueId: string,
  newCommissionerId: string
): Promise<League> => {
  return fetchWithAuth(`/leagues/${leagueId}/transfer-commissioner`, {
    method: "POST",
    body: JSON.stringify({ user_id: newCommissionerId }),
  });
};
