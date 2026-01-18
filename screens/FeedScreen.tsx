import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
} from "react-native";
import { Bet, Wager, User } from "../types";
import { getBets, getBetWagers, getUser } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export const FeedScreen: React.FC = () => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [showBetModal, setShowBetModal] = useState(false);
  const [wagers, setWagers] = useState<Wager[]>([]);
  const [wagerUsers, setWagerUsers] = useState<Record<string, User>>({});
  const [loadingWagers, setLoadingWagers] = useState(false);
  const { user } = useAuth();

  const loadBets = async () => {
    try {
      const data = await getBets();
      setBets(data);
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

  const handleBetPress = async (bet: Bet) => {
    setSelectedBet(bet);
    setShowBetModal(true);
    setLoadingWagers(true);
    try {
      const wagersData = await getBetWagers(bet.id);
      setWagers(wagersData);
      
      // Fetch user information for each wager
      const usersMap: Record<string, User> = {};
      await Promise.all(
        wagersData.map(async (wager) => {
          try {
            const userData = await getUser(wager.user_id);
            usersMap[wager.user_id] = userData;
          } catch (error) {
            console.error(`Error fetching user ${wager.user_id}:`, error);
          }
        })
      );
      setWagerUsers(usersMap);
    } catch (error) {
      console.error("Error loading wagers:", error);
      setWagers([]);
      setWagerUsers({});
    } finally {
      setLoadingWagers(false);
    }
  };

  const renderBetItem = ({ item }: { item: Bet }) => (
    <TouchableOpacity style={styles.betCard} onPress={() => handleBetPress(item)}>
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

      {/* Bet Detail Modal */}
      <Modal
        visible={showBetModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView style={styles.modalScrollView}>
              {selectedBet && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{selectedBet.title}</Text>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => {
                        setShowBetModal(false);
                        setSelectedBet(null);
                        setWagers([]);
                        setWagerUsers({});
                      }}
                    >
                      <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalBetInfo}>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>Type:</Text>
                      <Text style={styles.modalValue}>{selectedBet.type.toUpperCase()}</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>Status:</Text>
                      <Text style={[styles.modalValue, styles[`status${selectedBet.status}`]]}>
                        {selectedBet.status.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalLabel}>Stake:</Text>
                      <Text style={styles.modalValue}>${selectedBet.stake}</Text>
                    </View>
                    {selectedBet.status === "resolved" && selectedBet.winner && (
                      <View style={styles.modalInfoRow}>
                        <Text style={styles.modalLabel}>Winner:</Text>
                        <Text style={[styles.modalValue, styles.winnerText]}>
                          {selectedBet.winner}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Options</Text>
                    {selectedBet.options.map((option, index) => (
                      <View key={index} style={styles.optionRow}>
                        <Text style={styles.optionText}>• {option}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>
                      Participants ({wagers.length})
                    </Text>
                    {loadingWagers ? (
                      <Text style={styles.loadingText}>Loading wagers...</Text>
                    ) : wagers.length === 0 ? (
                      <Text style={styles.emptyWagersText}>No wagers placed yet</Text>
                    ) : (
                      wagers.map((wager) => {
                        const wagerUser = wagerUsers[wager.user_id];
                        return (
                          <View key={wager.id} style={styles.wagerRow}>
                            <View style={styles.wagerHeader}>
                              {wagerUser?.profile_pic && (
                                <Image
                                  source={{ uri: wagerUser.profile_pic }}
                                  style={styles.wagerAvatar}
                                />
                              )}
                              <View style={styles.wagerInfo}>
                                <Text style={styles.wagerUsername}>
                                  {wagerUser?.username || `User ${wager.user_id.substring(0, 8)}...`}
                                </Text>
                                <Text style={styles.wagerSelection}>
                                  Choice: <Text style={styles.wagerSelectionValue}>{wager.selection}</Text>
                                </Text>
                                <Text style={styles.wagerStake}>
                                  Stake: <Text style={styles.wagerStakeValue}>${wager.stake}</Text>
                                </Text>
                                {wager.status !== "pending" && (
                                  <Text
                                    style={[
                                      styles.wagerStatus,
                                      wager.status === "won" ? styles.wagerWon : styles.wagerLost,
                                    ]}
                                  >
                                    Status: {wager.status.toUpperCase()}
                                    {wager.payout !== undefined && wager.payout !== null && (
                                      <Text> (Payout: ${wager.payout.toFixed(2)})</Text>
                                    )}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                </>
              )}
            </ScrollView>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1e1e1e",
    borderRadius: 16,
    width: "90%",
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "#333",
  },
  modalScrollView: {
    maxHeight: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    marginRight: 10,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalBetInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    color: "#aaa",
    fontWeight: "600",
  },
  modalValue: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  statusopen: {
    color: "#34C759",
  },
  statusclosed: {
    color: "#FF9500",
  },
  statusresolved: {
    color: "#007AFF",
  },
  statusdisputed: {
    color: "#FF3B30",
  },
  winnerText: {
    color: "#34C759",
  },
  modalSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  optionRow: {
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    color: "#ccc",
  },
  wagerRow: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  wagerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  wagerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  wagerInfo: {
    flex: 1,
    gap: 4,
  },
  wagerUsername: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 4,
  },
  wagerSelection: {
    fontSize: 14,
    color: "#ccc",
  },
  wagerSelectionValue: {
    color: "#007AFF",
    fontWeight: "600",
  },
  wagerStake: {
    fontSize: 14,
    color: "#ccc",
  },
  wagerStakeValue: {
    color: "#34C759",
    fontWeight: "600",
  },
  wagerStatus: {
    fontSize: 12,
    marginTop: 4,
  },
  wagerWon: {
    color: "#34C759",
  },
  wagerLost: {
    color: "#FF3B30",
  },
  loadingText: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    padding: 20,
  },
  emptyWagersText: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
    padding: 20,
    fontStyle: "italic",
  },
});
