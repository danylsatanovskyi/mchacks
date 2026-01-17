import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { LoginScreen } from "./screens/LoginScreen";
import { FeedScreen } from "./screens/FeedScreen";
import { CreateBetScreen } from "./screens/CreateBetScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#1a1a1a",
          borderBottomWidth: 1,
          borderBottomColor: "#333",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#888",
        tabBarStyle: {
          backgroundColor: "#1a1a1a",
          borderTopWidth: 1,
          borderTopColor: "#333",
        },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => (
            <View
              style={[
                styles.tabIcon,
                { borderColor: color, width: size, height: size },
              ]}
            />
          ),
        }}
      />
      <Tab.Screen
        name="CreateBet"
        component={CreateBetScreen}
        options={{
          title: "Create Bet",
          tabBarIcon: ({ color, size }) => (
            <View
              style={[
                styles.tabIcon,
                { borderColor: color, width: size, height: size },
              ]}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          title: "Leaderboard",
          tabBarIcon: ({ color, size }) => (
            <View
              style={[
                styles.tabIcon,
                { borderColor: color, width: size, height: size },
              ]}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AppContent = () => {
  const { user, isLoading } = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Show login screen if user is not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  // Show main app if user is authenticated
  return (
    <NavigationContainer>
      <MainTabs />
      <StatusBar style="light" />
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  tabIcon: {
    borderWidth: 2,
    borderRadius: 4,
  },
});
