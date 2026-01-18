import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  Auth0User,
  // login as auth0Login,
  // logout as auth0Logout,
  // initializeAuth,
} from "../services/auth0";
import { UserProfile } from "../types";
import { getCurrentUser } from "../services/api";
import { setCurrentUserId } from "../services/api";

interface AuthContextType {
  user: Auth0User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fake user credentials for development - remove when Auth0 is ready
const FAKE_CREDENTIALS = {
  "devuser@mchacks.ca": {
    password: "devuser",
    userId: "fake-user-id-123",
    name: "Dev User",
    picture: "https://i.pravatar.cc/150?img=12",
  },
  "testuser@mchacks.ca": {
    password: "testuser",
    userId: "fake-user-id-456",
    name: "Test User",
    picture: "https://i.pravatar.cc/150?img=1",
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<Auth0User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fake initialization - skip Auth0 for now
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

  const handleLogin = async (email: string, password: string) => {
    // Fake login - validate credentials and fetch user from backend
    // TODO: Re-enable Auth0 login when ready
    // try {
    //   const { user: authUser } = await auth0Login();
    //   setUser(authUser);
    // } catch (error) {
    //   console.error("Login error:", error);
    //   throw error;
    // }
    
    const normalizedEmail = email.toLowerCase().trim();
    const credentials = FAKE_CREDENTIALS[normalizedEmail];
    
    if (!credentials || credentials.password !== password) {
      throw new Error("Invalid email or password");
    }

    // Set the user ID for API calls
    setCurrentUserId(credentials.userId);
    
    // Fetch user profile from backend (this will create the user if it doesn't exist)
    try {
      const userData = await getCurrentUser(credentials.userId);
      
      // Create Auth0User object
      const auth0User: Auth0User = {
        sub: credentials.userId,
        email: normalizedEmail,
        name: credentials.name,
        picture: credentials.picture,
      };
      
      // Create UserProfile from backend data
      const userProfile: UserProfile = {
        user_id: userData.id || userData.user_id || credentials.userId,
        username: userData.username || credentials.name,
        profile_pic: userData.profile_pic || credentials.picture,
        total_bets: userData.total_bets || 0,
        total_wins: userData.total_wins || 0,
        total_losses: userData.total_losses || 0,
        current_pnl: userData.current_pnl || 0,
        greatest_win: userData.greatest_win || 0,
        greatest_loss: userData.greatest_loss || 0,
        win_streak: userData.win_streak || 0,
        current_balance: userData.balance || 0,
      };
      
      setUser(auth0User);
      setProfile(userProfile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw new Error("Failed to load user profile");
    }
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

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      const userData = await getCurrentUser(user.sub);
      
      const userProfile: UserProfile = {
        user_id: userData.id || userData.user_id || user.sub,
        username: userData.username || user.name,
        profile_pic: userData.profile_pic || user.picture,
        total_bets: userData.total_bets || 0,
        total_wins: userData.total_wins || 0,
        total_losses: userData.total_losses || 0,
        current_pnl: userData.current_pnl || 0,
        greatest_win: userData.greatest_win || 0,
        greatest_loss: userData.greatest_loss || 0,
        win_streak: userData.win_streak || 0,
        current_balance: userData.balance || 0,
      };
      
      setProfile(userProfile);
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  }, [user]);

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
        refreshProfile,
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
