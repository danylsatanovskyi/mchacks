import { Bet, Event, Wager, LeaderboardEntry, User } from "../types";

// Backend API base URL - update this with your FastAPI server URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

// Auth token - will be set from Auth0
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
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
  type: "binary" | "ranked";
  title: string;
  options: string[];
  stake: number;
}): Promise<Bet> => {
  return fetchWithAuth("/bets", {
    method: "POST",
    body: JSON.stringify(betData),
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
}): Promise<Wager> => {
  return fetchWithAuth("/wagers", {
    method: "POST",
    body: JSON.stringify(wagerData),
  });
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
export const getCurrentUser = async (): Promise<User> => {
  return fetchWithAuth("/users/me");
};
