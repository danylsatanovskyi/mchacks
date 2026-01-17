import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { LeaderboardEntry, AgentMessage } from "../types";
import { getLeaderboard } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

// Dummy data for development
const dummyLeaderboard: LeaderboardEntry[] = [
  {
    user_id: "user1",
    username: "Player1",
    total_winnings: 150,
    total_wagered: 100,
    rank: 1,
    delta: 1,
  },
  {
    user_id: "user2",
    username: "Player2",
    total_winnings: 80,
    total_wagered: 120,
    rank: 2,
    delta: -1,
  },
  {
    user_id: "user3",
    username: "Player3",
    total_winnings: 50,
    total_wagered: 90,
    rank: 3,
    delta: 0,
  },
];

// Dummy agent messages - will be replaced with Gumloop integration
const dummyAgentMessages: AgentMessage[] = [
  {
    type: "roast_top",
    message: "🔥 Player1 is on fire! But can they keep it up?",
  },
  {
    type: "glaze_top",
    message: "💎 What a legend! That's how you dominate!",
  },
  {
    type: "roast_bottom",
    message: "💀 Player3 needs to step it up or pack it up!",
  },
];

const getRankEmoji = (rank: number) => {
  switch (rank) {
    case 1:
      return "🥇";
    case 2:
      return "🥈";
    case 3:
      return "🥉";
    default:
      return `${rank}.`;
  }
};

export const LeaderboardScreen: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(dummyLeaderboard);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const loadLeaderboard = async () => {
    try {
      // TODO: Replace with actual API call when backend is ready
      // const data = await getLeaderboard();
      // setLeaderboard(data);
      
      // TODO: Replace with Gumloop agent integration
      // const messages = await getAgentMessages();
      // setAgentMessages(messages);
      
      console.log("Loading leaderboard...");
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user) {
      loadLeaderboard();
      // Show agent messages periodically
      setAgentMessages(dummyAgentMessages);
    }
  }, [user]);

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const showAgentMessage = index === 0 || index === leaderboard.length - 1;
    const relevantMessage = agentMessages.find(
      (msg) =>
        (index === 0 && (msg.type === "roast_top" || msg.type === "glaze_top")) ||
        (index === leaderboard.length - 1 && msg.type === "roast_bottom")
    );

    return (
      <View>
        <View
          style={[
            styles.leaderboardItem,
            index === 0 && styles.leaderboardItemFirst,
            index === 1 && styles.leaderboardItemSecond,
            index === 2 && styles.leaderboardItemThird,
          ]}
        >
          <View style={styles.rankContainer}>
            <Text style={styles.rankEmoji}>{getRankEmoji(item.rank)}</Text>
            <View style={styles.userInfo}>
              <Text style={styles.username}>{item.username}</Text>
              {item.delta !== undefined && item.delta !== 0 && (
                <Text
                  style={[
                    styles.delta,
                    item.delta > 0 ? styles.deltaPositive : styles.deltaNegative,
                  ]}
                >
                  {item.delta > 0 ? "↑" : "↓"} {Math.abs(item.delta)}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.statsContainer}>
            <Text style={styles.winnings}>${item.total_winnings}</Text>
            <Text style={styles.wagered}>Wagered: ${item.total_wagered}</Text>
          </View>
        </View>
        {showAgentMessage && relevantMessage && (
          <View
            style={[
              styles.agentMessage,
              relevantMessage.type === "roast_top" && styles.agentMessageRoast,
              relevantMessage.type === "glaze_top" && styles.agentMessageGlaze,
              relevantMessage.type === "roast_bottom" && styles.agentMessageRoast,
            ]}
          >
            <Text style={styles.agentMessageText}>{relevantMessage.message}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={leaderboard}
        renderItem={renderLeaderboardItem}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#007AFF"
            colors={["#007AFF"]}
          />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No leaderboard data yet.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  list: {
    padding: 16,
  },
  leaderboardItem: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  leaderboardItemFirst: {
    borderWidth: 2,
    borderColor: "#FFD700",
    backgroundColor: "#2a2415",
  },
  leaderboardItemSecond: {
    borderWidth: 2,
    borderColor: "#C0C0C0",
    backgroundColor: "#252525",
  },
  leaderboardItemThird: {
    borderWidth: 2,
    borderColor: "#CD7F32",
    backgroundColor: "#2a2318",
  },
  rankContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rankEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    color: "#fff",
  },
  delta: {
    fontSize: 12,
    fontWeight: "600",
  },
  deltaPositive: {
    color: "#34C759",
  },
  deltaNegative: {
    color: "#FF3B30",
  },
  statsContainer: {
    alignItems: "flex-end",
  },
  winnings: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#34C759",
    marginBottom: 4,
  },
  wagered: {
    fontSize: 12,
    color: "#aaa",
  },
  agentMessage: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    marginLeft: 48,
  },
  agentMessageRoast: {
    backgroundColor: "#2a1f1f",
    borderLeftWidth: 4,
    borderLeftColor: "#FF3B30",
  },
  agentMessageGlaze: {
    backgroundColor: "#1a252a",
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  agentMessageText: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#fff",
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
    fontSize: 16,
  },
});
