import React, { createContext, useContext, useEffect, useState } from "react";
import {
  Auth0User,
  // login as auth0Login,
  // logout as auth0Logout,
  // initializeAuth,
} from "../services/auth0";

interface AuthContextType {
  user: Auth0User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fake user for development - remove when Auth0 is ready
const FAKE_USER: Auth0User = {
  sub: "fake-user-id-123",
  email: "dev@mchacks.com",
  name: "Dev User",
  picture: undefined,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<Auth0User | null>(null);
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
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login: handleLogin,
        logout: handleLogout,
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
