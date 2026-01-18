import React, { createContext, useContext, useEffect, useState } from "react";
import {
  Auth0User,
  // login as auth0Login,
  // logout as auth0Logout,
  // initializeAuth,
} from "../services/auth0";
import { UserProfile } from "../types";

interface AuthContextType {
  user: Auth0User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fake user for development - remove when Auth0 is ready
const FAKE_USER: Auth0User = {
  sub: "fake-user-id-123",
  email: "dev@mchacks.com",
  name: "Dev User",
  picture: "https://i.pravatar.cc/150?img=12", // Placeholder avatar
};
const FAKE_PROFILE: UserProfile = {
  user_id: "fake-user-id-123",
  username: "Dev User",
  profile_pic: "https://i.pravatar.cc/150?img=12",
  total_bets: 47,
  total_wins: 28,
  total_losses: 19,
  current_pnl: 145,
  greatest_win: 250,
  greatest_loss: -50,
  win_streak: 5,
  current_balance: 345,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<Auth0User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fake initialization - skip Auth0 for now
    setProfile(FAKE_PROFILE);
    setIsLoading(false);
    // TODO: Re-enable when Auth0 is ready
    // const init = async () => {
    //   try {
    //     const { user: storedUser } = await initializeAuth();
    //     setUser(storedUser);
    //   } catch (error) {
    //     console.error("Auth initialization error:", error);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    // init();
  }, []);

  const handleLogin = async () => {
    // Fake login - just set the fake user
    // TODO: Re-enable Auth0 login when ready
    // try {
    //   const { user: authUser } = await auth0Login();
    //   setUser(authUser);
    // } catch (error) {
    //   console.error("Login error:", error);
    //   throw error;
    // }
    
    // Simulate a small delay for realism
    await new Promise((resolve) => setTimeout(resolve, 300));
    setUser(FAKE_USER);
    setProfile(FAKE_PROFILE);
  };

  const handleLogout = async () => {
    // Fake logout - just clear the user
    // TODO: Re-enable Auth0 logout when ready
    // try {
    //   await auth0Logout();
    //   setUser(null);
    // } catch (error) {
    //   console.error("Logout error:", error);
    // }
    setUser(null);
    setProfile(null);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated: !!user,
        login: handleLogin,
        logout: handleLogout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
