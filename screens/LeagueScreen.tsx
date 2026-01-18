import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { League, LeagueMember, LeaderboardEntry, AgentMessage } from "../types";
import { useAuth } from "../contexts/AuthContext";
import {
  getLeaderboard,
  transferCommissioner,
  updateLeagueName,
} from "../services/api";

// Dummy data
const dummyLeague: League = {
  id: "league1",
  name: "The Champions League",
  commissioner_id: "fake-user-id-123",
  created_at: new Date().toISOString(),
  member_ids: ["fake-user-id-123", "user2", "user3"],
  invite_code: "CHAMP2024",
};

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

const dummyAgentMessages: AgentMessage[] = [
  {
    type: "roast_top",
    message: "🔥 Dev User is on fire! But can they keep it up?",
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

export const LeagueScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"leaderboard" | "members">(
    "leaderboard",
  );
  const [league, setLeague] = useState<League>(dummyLeague);
  const [leagueName, setLeagueName] = useState(dummyLeague.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [members, setMembers] = useState<LeagueMember[]>(dummyMembers);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [showTitleEditModal, setShowTitleEditModal] = useState(false);
  const [titleLabels, setTitleLabels] = useState({
    jester: "Jester",
    king: "King",
    addict: "Addict",
    capitalist: "Capitalist",
    fool: "Fool",
    genius: "Genius",
  });

  const isCommissioner = user?.sub === league.commissioner_id;

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard({ group_id: league.id });
      setLeaderboard(data);
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
      setAgentMessages(dummyAgentMessages);
    }
  }, [user]);

  useEffect(() => {
    if (!profile) return;
    setMembers((prev) =>
      prev.map((member) =>
        member.user_id === profile.user_id
          ? {
              ...member,
              username: profile.username,
              profile_pic: profile.profile_pic,
            }
          : member,
      ),
    );
    setLeaderboard((prev) =>
      prev.map((entry) =>
        entry.user_id === profile.user_id
          ? {
              ...entry,
              username: profile.username,
              profile_pic: profile.profile_pic,
            }
          : entry,
      ),
    );
  }, [profile]);

  const handleInvite = () => {
    setInviteCode(league.invite_code || "");
    setShowInviteModal(true);
  };

  const handleSaveLeagueName = () => {
    if (!leagueName.trim()) {
      Alert.alert("Error", "League name cannot be empty");
      return;
    }
    updateLeagueName(league.id, leagueName.trim())
      .then((updatedLeague) => {
        setLeague(updatedLeague);
        setIsEditingName(false);
      })
      .catch((error) => {
        console.error("Error updating league name:", error);
        Alert.alert("Error", "Failed to update league name");
      });
  };

  const handleKickUser = (userId: string, username: string) => {
    if (!isCommissioner) return;

    Alert.alert(
      "Kick Member",
      `Are you sure you want to kick ${username} from the league?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Kick",
          style: "destructive",
          onPress: async () => {
            // TODO: API call to kick user
            console.log("Kicking user:", userId);
            setMembers((prev) => prev.filter((m) => m.user_id !== userId));
            setLeaderboard((prev) =>
              prev.filter((entry) => entry.user_id !== userId),
            );
          },
        },
      ],
    );
  };

  const handleTransferCommissioner = (userId: string, username: string) => {
    if (!isCommissioner) return;
    Alert.alert(
      "Transfer Commissioner",
      `Make ${username} the new commissioner? You will lose commissioner privileges.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer",
          style: "destructive",
          onPress: () => {
            transferCommissioner(league.id, userId)
              .then((updatedLeague) => {
                setLeague(updatedLeague);
                setMembers((prev) =>
                  prev.map((member) => ({
                    ...member,
                    is_commissioner: member.user_id === userId,
                  })),
                );
              })
              .catch((error) => {
                console.error("Error transferring commissioner:", error);
                Alert.alert("Error", "Failed to transfer commissioner");
              });
          },
        },
      ],
    );
  };

  const getTitleWinners = () => {
    if (leaderboard.length === 0) return null;

    const maxBy = (key: keyof LeaderboardEntry) =>
      leaderboard.reduce((acc, curr) => {
        const currVal = (curr[key] as number) ?? -Infinity;
        const accVal = (acc[key] as number) ?? -Infinity;
        return currVal > accVal ? curr : acc;
      }, leaderboard[0]);

    const minBy = (key: keyof LeaderboardEntry) =>
      leaderboard.reduce((acc, curr) => {
        const currVal = (curr[key] as number) ?? Infinity;
        const accVal = (acc[key] as number) ?? Infinity;
        return currVal < accVal ? curr : acc;
      }, leaderboard[0]);

    return {
      jester: maxBy("total_losses"),
      king: maxBy("total_wins"),
      addict: maxBy("total_bets"),
      capitalist: maxBy("current_pnl"),
      fool: minBy("greatest_loss"),
      genius: maxBy("greatest_win"),
    };
  };

  const titleWinners = getTitleWinners();

  const renderLeaderboardItem = ({
    item,
    index,
  }: {
    item: LeaderboardEntry;
    index: number;
  }) => {
    const showAgentMessage = index === 0 || index === leaderboard.length - 1;
    const relevantMessage = agentMessages.find(
      (msg) =>
        (index === 0 &&
          (msg.type === "roast_top" || msg.type === "glaze_top")) ||
        (index === leaderboard.length - 1 && msg.type === "roast_bottom"),
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
            {item.profile_pic && (
              <Image
                source={{ uri: item.profile_pic }}
                style={styles.profilePic}
              />
            )}
            <View style={styles.userInfo}>
              <Text style={styles.username}>{item.username}</Text>
              {item.delta !== undefined && item.delta !== 0 && (
                <Text
                  style={[
                    styles.delta,
                    item.delta > 0
                      ? styles.deltaPositive
                      : styles.deltaNegative,
                  ]}
                >
                  {item.delta > 0 ? "↑" : "↓"} {Math.abs(item.delta)}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.statsContainer}>
            <Text style={styles.winnings}>${item.total_winnings}</Text>
            <Text
              style={[
                styles.pnl,
                item.current_pnl >= 0 ? styles.positive : styles.negative,
              ]}
            >
              {item.current_pnl >= 0 ? "+" : ""}${item.current_pnl}
            </Text>
            <Text style={styles.wagered}>Wagered: ${item.total_wagered}</Text>
          </View>
        </View>
        {showAgentMessage && relevantMessage && (
          <View
            style={[
              styles.agentMessage,
              relevantMessage.type === "roast_top" && styles.agentMessageRoast,
              relevantMessage.type === "glaze_top" && styles.agentMessageGlaze,
              relevantMessage.type === "roast_bottom" &&
                styles.agentMessageRoast,
            ]}
          >
            <Text style={styles.agentMessageText}>
              {relevantMessage.message}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderMemberItem = ({ item }: { item: LeagueMember }) => (
    <View style={styles.memberItem}>
      {item.profile_pic && (
        <Image source={{ uri: item.profile_pic }} style={styles.memberPic} />
      )}
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {item.username}
          {item.is_commissioner && (
            <Text style={styles.commissionerBadge}> 👑 Commissioner</Text>
          )}
        </Text>
        <Text style={styles.memberJoined}>
          Joined {new Date(item.joined_at).toLocaleDateString()}
        </Text>
      </View>
      {isCommissioner && !item.is_commissioner && (
        <View style={styles.memberActions}>
          <TouchableOpacity
            style={styles.crownButton}
            onPress={() =>
              handleTransferCommissioner(item.user_id, item.username)
            }
          >
            <Text style={styles.crownButtonText}>👑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.kickButton}
            onPress={() => handleKickUser(item.user_id, item.username)}
          >
            <Text style={styles.kickButtonText}>Kick</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* League Header */}
      <View style={styles.leagueHeader}>
        <View style={styles.leagueHeaderLeft}>
          {isEditingName ? (
            <TextInput
              style={styles.leagueNameInput}
              value={leagueName}
              onChangeText={setLeagueName}
              placeholder="League name"
              placeholderTextColor="#666"
            />
          ) : (
            <Text style={styles.leagueName}>{league.name}</Text>
          )}
          {isCommissioner && (
            <TouchableOpacity
              style={styles.editNameButton}
              onPress={() => setIsEditingName(!isEditingName)}
            >
              <Text style={styles.editNameButtonText}>
                {isEditingName ? "Cancel" : "Edit"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.leagueHeaderRight}>
          {isCommissioner && isEditingName && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveLeagueName}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          )}
          {isCommissioner && (
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={handleInvite}
            >
              <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Titles */}
      {titleWinners && (
        <View style={styles.titlesSection}>
          <View style={styles.titlesHeader}>
            <Text style={styles.sectionTitle}>League Titles</Text>
            {isCommissioner && (
              <TouchableOpacity
                style={styles.editTitlesButton}
                onPress={() => setShowTitleEditModal(true)}
              >
                <Text style={styles.editTitlesButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.titlesGrid}>
            <View style={styles.titleCard}>
              <Text style={styles.titleLabel}>{titleLabels.king}</Text>
              <Text style={styles.titleName}>
                {titleWinners.king?.username}
              </Text>
              <Text style={styles.titleStat}>Most wins</Text>
            </View>
            <View style={styles.titleCard}>
              <Text style={styles.titleLabel}>{titleLabels.jester}</Text>
              <Text style={styles.titleName}>
                {titleWinners.jester?.username}
              </Text>
              <Text style={styles.titleStat}>Most losses</Text>
            </View>
            <View style={styles.titleCard}>
              <Text style={styles.titleLabel}>{titleLabels.addict}</Text>
              <Text style={styles.titleName}>
                {titleWinners.addict?.username}
              </Text>
              <Text style={styles.titleStat}>Most bets</Text>
            </View>
            <View style={styles.titleCard}>
              <Text style={styles.titleLabel}>{titleLabels.capitalist}</Text>
              <Text style={styles.titleName}>
                {titleWinners.capitalist?.username}
              </Text>
              <Text style={styles.titleStat}>Best P&L</Text>
            </View>
            <View style={styles.titleCard}>
              <Text style={styles.titleLabel}>{titleLabels.fool}</Text>
              <Text style={styles.titleName}>
                {titleWinners.fool?.username}
              </Text>
              <Text style={styles.titleStat}>Greatest loss</Text>
            </View>
            <View style={styles.titleCard}>
              <Text style={styles.titleLabel}>{titleLabels.genius}</Text>
              <Text style={styles.titleName}>
                {titleWinners.genius?.username}
              </Text>
              <Text style={styles.titleStat}>Greatest gain</Text>
            </View>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "leaderboard" && styles.tabActive]}
          onPress={() => setActiveTab("leaderboard")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "leaderboard" && styles.tabTextActive,
            ]}
          >
            Leaderboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "members" && styles.tabActive]}
          onPress={() => setActiveTab("members")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "members" && styles.tabTextActive,
            ]}
          >
            Members ({members.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === "leaderboard" ? (
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
      ) : (
        <FlatList
          data={members}
          renderItem={renderMemberItem}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No members yet.</Text>
          }
        />
      )}

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Invite Members</Text>
            <Text style={styles.modalSubtitle}>
              Share this code to invite others:
            </Text>
            <View style={styles.inviteCodeContainer}>
              <Text style={styles.inviteCode}>{inviteCode}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => {
                  // TODO: Copy to clipboard
                  Alert.alert("Copied!", "Invite code copied to clipboard");
                }}
              >
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowInviteModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Titles Modal */}
      <Modal
        visible={showTitleEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTitleEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Title Labels</Text>
            {Object.entries(titleLabels).map(([key, value]) => (
              <View key={key} style={styles.titleEditRow}>
                <Text style={styles.titleEditKey}>{key}</Text>
                <TextInput
                  style={styles.titleEditInput}
                  value={value}
                  onChangeText={(text) =>
                    setTitleLabels((prev) => ({ ...prev, [key]: text }))
                  }
                  placeholderTextColor="#666"
                />
              </View>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTitleEditModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
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
  leagueHeader: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  leagueHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  leagueHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  leagueName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  leagueNameInput: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
  },
  editNameButton: {
    backgroundColor: "#2a2a2a",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  editNameButtonText: {
    color: "#007AFF",
    fontSize: 12,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#34C759",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  inviteButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inviteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  titlesSection: {
    padding: 16,
    backgroundColor: "#121212",
  },
  titlesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  titlesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  titleCard: {
    width: "47%",
    backgroundColor: "#1e1e1e",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  titleLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFD700",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    color: "#fff",
  },
  titleName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  titleStat: {
    fontSize: 12,
    color: "#aaa",
  },
  editTitlesButton: {
    backgroundColor: "#2a2a2a",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  editTitlesButtonText: {
    color: "#007AFF",
    fontSize: 12,
    fontWeight: "600",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#007AFF",
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
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  pnl: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  positive: {
    color: "#34C759",
  },
  negative: {
    color: "#FF3B30",
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
  memberItem: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  memberPic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  commissionerBadge: {
    fontSize: 14,
    color: "#FFD700",
  },
  memberJoined: {
    fontSize: 12,
    color: "#aaa",
  },
  memberActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  crownButton: {
    backgroundColor: "#2a2415",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  crownButtonText: {
    fontSize: 14,
  },
  kickButton: {
    backgroundColor: "#2a1f1f",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  kickButtonText: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "600",
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
  modal: {
    backgroundColor: "#1e1e1e",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    borderWidth: 1,
    borderColor: "#333",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 16,
  },
  inviteCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  inviteCode: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    letterSpacing: 2,
  },
  copyButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalCloseButton: {
    backgroundColor: "#2a2a2a",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  modalCloseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  titleEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  titleEditKey: {
    width: 80,
    fontSize: 12,
    color: "#aaa",
    textTransform: "capitalize",
  },
  titleEditInput: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
  },
});
