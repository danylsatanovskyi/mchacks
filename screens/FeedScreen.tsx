import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Bet } from "../types";
import { getBets } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

// Dummy data for development
const dummyBets: Bet[] = [
  {
    id: "1",
    creator_id: "user1",
    event_id: "event1",
    type: "binary",
    title: "Who will win? Lakers vs Warriors",
    options: ["Lakers", "Warriors"],
    stake: 10,
    status: "open",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    creator_id: "user2",
    event_id: "event2",
    type: "multiple-choice",
    title: "Top 3 finishers - Formula 1",
    options: ["Hamilton", "Verstappen", "Leclerc", "Sainz"],
    stake: 20,
    status: "open",
    created_at: new Date().toISOString(),
  },
];

export const FeedScreen: React.FC = () => {
  const [bets, setBets] = useState<Bet[]>(dummyBets);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const loadBets = async () => {
    try {
      // TODO: Replace with actual API call when backend is ready
      // const data = await getBets();
      // setBets(data);
      console.log("Loading bets...");
    } catch (error) {
      console.error("Error loading bets:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBets();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user) {
      loadBets();
    }
  }, [user]);

  const renderBetItem = ({ item }: { item: Bet }) => (
    <TouchableOpacity style={styles.betCard}>
      <View style={styles.betHeader}>
        <Text style={styles.betType}>{item.type.toUpperCase()}</Text>
        <Text style={styles.betStatus}>{item.status}</Text>
      </View>
      <Text style={styles.betTitle}>{item.title}</Text>
      <View style={styles.betOptions}>
        {item.options.map((option, index) => (
          <Text key={index} style={styles.option}>
            • {option}
          </Text>
        ))}
      </View>
      <View style={styles.betFooter}>
        <Text style={styles.stake}>Stake: ${item.stake}</Text>
        {item.status === "resolved" && item.winner && (
          <Text style={styles.winner}>Winner: {item.winner}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={bets}
        renderItem={renderBetItem}
        keyExtractor={(item) => item.id}
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
          <Text style={styles.emptyText}>No bets yet. Create one!</Text>
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
  betCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  betHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  betType: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
    textTransform: "uppercase",
  },
  betStatus: {
    fontSize: 12,
    fontWeight: "600",
    color: "#34C759",
  },
  betTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#fff",
  },
  betOptions: {
    marginBottom: 12,
  },
  option: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 4,
  },
  betFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  stake: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  winner: {
    fontSize: 14,
    fontWeight: "600",
    color: "#34C759",
  },
  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 40,
    fontSize: 16,
  },
});
