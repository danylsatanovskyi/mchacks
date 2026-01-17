import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import { setAuthToken } from "./api";

// Auth0 configuration - update these with your Auth0 credentials
const AUTH0_DOMAIN = process.env.EXPO_PUBLIC_AUTH0_DOMAIN || "";
const AUTH0_CLIENT_ID = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || "";
const AUTH0_AUDIENCE = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE || "";

const TOKEN_STORAGE_KEY = "auth0_token";
const USER_STORAGE_KEY = "auth0_user";

// Discovery document for Auth0
const discovery = {
  authorizationEndpoint: `https://${AUTH0_DOMAIN}/authorize`,
  tokenEndpoint: `https://${AUTH0_DOMAIN}/oauth/token`,
  revocationEndpoint: `https://${AUTH0_DOMAIN}/oauth/revoke`,
};

export interface Auth0User {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export const login = async (): Promise<{
  accessToken: string;
  user: Auth0User;
}> => {
  const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });

  const request = new AuthSession.AuthRequest({
    clientId: AUTH0_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
    responseType: AuthSession.ResponseType.Token,
    redirectUri,
    extraParams: {
      audience: AUTH0_AUDIENCE,
    },
  });

  const result = await request.promptAsync(discovery);

  if (result.type === "success") {
    const { access_token } = result.params;

    // Fetch user info
    const userResponse = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    const user: Auth0User = await userResponse.json();

    // Store token securely
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, access_token);
    await SecureStore.setItemAsync(USER_STORAGE_KEY, JSON.stringify(user));

    // Set token in API service
    setAuthToken(access_token);

    return { accessToken: access_token, user };
  }

  throw new Error("Authentication failed");
};

export const logout = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
  await SecureStore.deleteItemAsync(USER_STORAGE_KEY);
  setAuthToken(null);
};

export const getStoredToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const getStoredUser = async (): Promise<Auth0User | null> => {
  try {
    const userJson = await SecureStore.getItemAsync(USER_STORAGE_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch {
    return null;
  }
};

export const initializeAuth = async (): Promise<{
  token: string | null;
  user: Auth0User | null;
}> => {
  const token = await getStoredToken();
  const user = await getStoredUser();

  if (token) {
    setAuthToken(token);
  }

  return { token, user };
};
