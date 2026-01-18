import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { Bet, Wager, LeagueMember } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { getBets, createWager, getWagers, getUser } from "../services/api";

// Dummy league data (same as LeagueScreen)
const dummyLeagueId = "league1";
const dummyMembers: LeagueMember[] = [
  {
    user_id: "fake-user-id-123",
    username: "Dev User",
    profile_pic: "https://i.pravatar.cc/150?img=12",
    joined_at: new Date().toISOString(),
    is_commissioner: true,
  },
  {
    user_id: "user2",
    username: "Player2",
    profile_pic: "https://i.pravatar.cc/150?img=1",
    joined_at: new Date().toISOString(),
    is_commissioner: false,
  },
  {
    user_id: "user3",
    username: "Player3",
    profile_pic: "https://i.pravatar.cc/150?img=2",
    joined_at: new Date().toISOString(),
    is_commissioner: false,
  },
];

interface ChatMessage {
  id: string;
  type: "bet_notification" | "wager_placed" | "system";
  bet?: Bet;
  user_id?: string;
  username?: string;
  message?: string;
  timestamp: string;
}

export const LeagueChatScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [wagers, setWagers] = useState<Wager[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [showWagerModal, setShowWagerModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [wagerStake, setWagerStake] = useState<string>("");
  const [members] = useState<LeagueMember[]>(dummyMembers);
  const [userMap, setUserMap] = useState<Record<string, { username: string; profile_pic?: string }>>({});

  const loadBets = async () => {
    try {
      const [betsData, wagersData] = await Promise.all([
        getBets({ group_id: dummyLeagueId }),
        getWagers({ group_id: dummyLeagueId }),
      ]);
      
      setBets(betsData);
      setWagers(wagersData);

      // Fetch user information for wagers
      const userIds = new Set<string>();
      betsData.forEach((bet) => userIds.add(bet.creator_id));
      wagersData.forEach((wager) => userIds.add(wager.user_id));

      const userInfoMap: Record<string, { username: string; profile_pic?: string }> = {};
      await Promise.all(
        Array.from(userIds).map(async (userId) => {
          try {
            const userData = await getUser(userId);
            userInfoMap[userId] = {
              username: userData.username,
              profile_pic: userData.profile_pic,
            };
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
            userInfoMap[userId] = {
              username: members.find((m) => m.user_id === userId)?.username || "Unknown",
            };
          }
        })
      );
      setUserMap(userInfoMap);

      // Convert bets to chat messages
      const betMessages: ChatMessage[] = betsData.map((bet) => ({
        id: `bet-${bet.id}`,
        type: "bet_notification",
        bet,
        user_id: bet.creator_id,
        username: userInfoMap[bet.creator_id]?.username || "Unknown",
        timestamp: bet.created_at,
      }));

      // Convert wagers to chat messages
      const wagerMessages: ChatMessage[] = wagersData.map((wager) => {
        const bet = betsData.find((b) => b.id === wager.bet_id);
        return {
          id: `wager-${wager.id}`,
          type: "wager_placed",
          bet,
          user_id: wager.user_id,
          username: userInfoMap[wager.user_id]?.username || "Unknown",
          message: `placed ${wager.stake} units on "${wager.selection}"`,
          timestamp: wager.created_at,
        };
      });

      // Combine and sort by timestamp
      const allMessages = [...betMessages, ...wagerMessages];
      allMessages.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setMessages(allMessages);
    } catch (error) {
      console.error("Error loading bets and wagers:", error);
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
      // Poll for new bets every 10 seconds
      const interval = setInterval(loadBets, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handlePlaceWager = async () => {
    if (!selectedBet || !selectedOption || !wagerStake) {
      Alert.alert("Error", "Please select an option and enter a stake amount");
      return;
    }

    const stake = parseFloat(wagerStake);
    if (isNaN(stake) || stake <= 0) {
      Alert.alert("Error", "Please enter a valid stake amount");
      return;
    }

    if (stake > 25) {
      Alert.alert("Error", "Maximum stake is 25 units");
      return;
    }

    try {
      console.log("Creating wager with bet_id:", selectedBet.id);
      const createdWager = await createWager({
        bet_id: selectedBet.id,
        selection: selectedOption,
        stake,
      }, user?.sub || "fake-user-id-123");

      console.log("Wager created successfully:", createdWager);
      Alert.alert("Success", "Wager placed successfully!");
      setShowWagerModal(false);
      setSelectedBet(null);
      setSelectedOption("");
      setWagerStake("");
      await loadBets(); // Refresh bets and wagers to show updated status
    } catch (error: any) {
      console.error("Error creating wager:", error);
      const errorMessage = error.message || error.toString() || "Failed to place wager";
      Alert.alert("Error", errorMessage);
    }
  };

  const openWagerModal = (bet: Bet) => {
    if (bet.status !== "open") {
      Alert.alert("Error", "This bet is no longer open");
      return;
    }
    setSelectedBet(bet);
    setShowWagerModal(true);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.type === "bet_notification" && item.bet) {
      const creator = userMap[item.user_id] || 
        members.find((m) => m.user_id === item.user_id) || 
        { username: item.username || "Unknown" };
      const avatarUri = creator.profile_pic || 
        members.find((m) => m.user_id === item.user_id)?.profile_pic || "";
      
      return (
        <View style={styles.betNotificationCard}>
          <View style={styles.betNotificationHeader}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarPlaceholderText}>
                  {creator.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.betNotificationInfo}>
              <Text style={styles.betNotificationTitle}>
                🎲 New Bet Created!
              </Text>
              <Text style={styles.betNotificationCreator}>
                by {creator.username}
              </Text>
            </View>
          </View>
          <View style={styles.betDetails}>
            <Text style={styles.betTitle}>{item.bet.title}</Text>
            <Text style={styles.betType}>{item.bet.type.toUpperCase()}</Text>
            <View style={styles.optionsContainer}>
              {item.bet.options.map((option, idx) => (
                <Text key={idx} style={styles.option}>
                  • {option}
                </Text>
              ))}
            </View>
            <View style={styles.betFooter}>
              <Text style={styles.stake}>Stake: {item.bet.stake} units</Text>
              <Text style={styles.status}>Status: {item.bet.status}</Text>
            </View>
            {item.bet.status === "open" && (
              <TouchableOpacity
                style={styles.placeWagerButton}
                onPress={() => openWagerModal(item.bet!)}
              >
                <Text style={styles.placeWagerButtonText}>Place Wager</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    if (item.type === "wager_placed") {
      const wagerUser = userMap[item.user_id] || { username: item.username };
      const avatarUri = wagerUser.profile_pic || 
        (item.user_id === user?.sub ? profile?.profile_pic : "") ||
        members.find((m) => m.user_id === item.user_id)?.profile_pic || "";
      
      return (
        <View style={styles.wagerMessage}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.smallAvatar} />
          ) : (
            <View style={[styles.smallAvatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarPlaceholderText}>
                {wagerUser.username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.wagerMessageContent}>
            <Text style={styles.wagerMessageText}>
              <Text style={styles.wagerUsername}>{wagerUser.username}</Text>{" "}
              {item.message}
            </Text>
            {item.bet && (
              <Text style={styles.wagerBetTitle}>{item.bet.title}</Text>
            )}
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
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
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No bets yet</Text>
            <Text style={styles.emptySubtext}>
              Create a bet to see it appear here!
            </Text>
          </View>
        }
        inverted={false}
      />

      {/* Wager Modal */}
      <Modal
        visible={showWagerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWagerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Place Wager</Text>
            {selectedBet && (
              <>
                <Text style={styles.modalBetTitle}>{selectedBet.title}</Text>
                <Text style={styles.modalBetType}>
                  Type: {selectedBet.type}
                </Text>

                <Text style={styles.modalLabel}>Select Option:</Text>
                <View style={styles.optionsList}>
                  {selectedBet.options.map((option, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.optionButton,
                        selectedOption === option && styles.optionButtonSelected,
                      ]}
                      onPress={() => setSelectedOption(option)}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          selectedOption === option &&
                            styles.optionButtonTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedBet.type === "target-proximity" && (
                  <View style={styles.targetInputContainer}>
                    <Text style={styles.modalLabel}>Target Value:</Text>
                    <TextInput
                      style={styles.targetInput}
                      placeholder="Enter target value"
                      placeholderTextColor="#666"
                      value={selectedOption}
                      onChangeText={setSelectedOption}
                      keyboardType="numeric"
                    />
                  </View>
                )}

                <Text style={styles.modalLabel}>Stake Amount:</Text>
                <TextInput
                  style={styles.stakeInput}
                  placeholder="Enter stake (max 25)"
                  placeholderTextColor="#666"
                  value={wagerStake}
                  onChangeText={setWagerStake}
                  keyboardType="numeric"
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setShowWagerModal(false);
                      setSelectedBet(null);
                      setSelectedOption("");
                      setWagerStake("");
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handlePlaceWager}
                  >
                    <Text style={styles.confirmButtonText}>Place Wager</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  betNotificationCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  betNotificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  betNotificationInfo: {
    flex: 1,
  },
  betNotificationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  betNotificationCreator: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  betDetails: {
    marginTop: 8,
  },
  betTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  betType: {
    fontSize: 12,
    color: "#007AFF",
    marginBottom: 12,
    fontWeight: "600",
  },
  optionsContainer: {
    marginBottom: 12,
  },
  option: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 4,
  },
  betFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  stake: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  status: {
    fontSize: 14,
    color: "#888",
  },
  placeWagerButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    alignItems: "center",
  },
  placeWagerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  wagerMessage: {
    flexDirection: "row",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  smallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  wagerMessageContent: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 12,
  },
  wagerMessageText: {
    fontSize: 14,
    color: "#ccc",
  },
  wagerUsername: {
    fontWeight: "600",
    color: "#fff",
  },
  wagerBetTitle: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
    fontStyle: "italic",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: "#888",
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  avatarPlaceholder: {
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  modalBetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  modalBetType: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
  },
  optionsList: {
    marginBottom: 16,
  },
  optionButton: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionButtonSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#1a3a5a",
  },
  optionButtonText: {
    fontSize: 16,
    color: "#ccc",
  },
  optionButtonTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  targetInputContainer: {
    marginBottom: 16,
  },
  targetInput: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
    marginTop: 8,
  },
  stakeInput: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#2a2a2a",
    marginRight: 8,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#007AFF",
    marginLeft: 8,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
