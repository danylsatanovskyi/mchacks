import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { UserProfile } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { getCurrentUser, updateUserProfile } from "../services/api";

// Dummy profile data
const dummyProfile: UserProfile = {
  user_id: "fake-user-id-123",
  username: "Dev User",
  profile_pic: "https://i.pravatar.cc/150?img=12",
  total_bets: 0,
  total_wins: 0,
  total_losses: 0,
  current_pnl: 0,
  greatest_win: 0,
  greatest_loss: 0,
  win_streak: 0,
  current_balance: 0,
};

const StatCard: React.FC<{
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
}> = ({ label, value, color = "#fff", icon }) => (
  <View style={styles.statCard}>
    {icon && <Text style={styles.statIcon}>{icon}</Text>}
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export const ProfileScreen: React.FC = () => {
  const { user, logout, profile: authProfile, updateProfile } = useAuth();
  const [profileState, setProfileState] = useState<UserProfile>(dummyProfile);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState(profileState.username);
  const [editProfilePic, setEditProfilePic] =
    useState(profileState.profile_pic || "");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getCurrentUser();
        setProfileState({
          user_id: data.id || data.user_id,
          username: data.username,
          profile_pic: data.profile_pic,
          total_bets: data.total_bets || 0,
          total_wins: data.total_wins || 0,
          total_losses: data.total_losses || 0,
          current_pnl: data.current_pnl || 0,
          greatest_win: data.greatest_win || 0,
          greatest_loss: data.greatest_loss || 0,
          win_streak: data.win_streak || 0,
          current_balance: data.balance || 0,
        });
        updateProfile({
          user_id: data.id || data.user_id,
          username: data.username,
          profile_pic: data.profile_pic,
          total_bets: data.total_bets || 0,
          total_wins: data.total_wins || 0,
          total_losses: data.total_losses || 0,
          current_pnl: data.current_pnl || 0,
          greatest_win: data.greatest_win || 0,
          greatest_loss: data.greatest_loss || 0,
          win_streak: data.win_streak || 0,
          current_balance: data.balance || 0,
        });
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    if (user) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleLogout = async () => {
    await logout();
  };

  const openEditProfile = () => {
    setEditUsername(profileState.username);
    setEditProfilePic(profileState.profile_pic || "");
    setShowEditModal(true);
  };

  const handleSaveProfile = () => {
    if (!editUsername.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }
    const updates = {
      username: editUsername.trim(),
      profile_pic: editProfilePic.trim() || profileState.profile_pic,
    };
    updateUserProfile(updates)
      .then(() => {
        setProfileState((prev) => ({
          ...prev,
          ...updates,
        }));
        updateProfile(updates);
        setShowEditModal(false);
      })
      .catch((error) => {
        console.error("Error updating profile:", error);
        Alert.alert("Error", "Failed to update profile");
      });
  };

  const winRate =
    profileState.total_bets > 0
      ? ((profileState.total_wins / profileState.total_bets) * 100).toFixed(1)
    : "0";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.header}>
        <Image
          source={{
            uri: profileState.profile_pic || "https://i.pravatar.cc/150",
          }}
          style={styles.avatar}
        />
        <Text style={styles.username}>{profileState.username}</Text>
        <TouchableOpacity style={styles.editButton} onPress={openEditProfile}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text
          style={[
            styles.balanceValue,
            profileState.current_balance >= 0 ? styles.positive : styles.negative,
          ]}
        >
          ${profileState.current_balance.toFixed(2)}
        </Text>
        <Text style={styles.pnlLabel}>
          Total P&L:{" "}
          <Text
            style={
              profileState.current_pnl >= 0 ? styles.positive : styles.negative
            }
          >
            {profileState.current_pnl >= 0 ? "+" : ""}
            ${profileState.current_pnl.toFixed(2)}
          </Text>
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard label="Total Bets" value={profileState.total_bets} icon="🎲" />
        <StatCard
          label="Win Rate"
          value={`${winRate}%`}
          icon="📊"
          color="#34C759"
        />
        <StatCard
          label="Wins"
          value={profileState.total_wins}
          icon="✅"
          color="#34C759"
        />
        <StatCard
          label="Losses"
          value={profileState.total_losses}
          icon="❌"
          color="#FF3B30"
        />
      </View>

      {/* Performance Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance</Text>
        
        <View style={styles.performanceRow}>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Greatest Win</Text>
            <Text style={[styles.performanceValue, styles.positive]}>
              +${profileState.greatest_win.toFixed(2)}
            </Text>
          </View>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Greatest Loss</Text>
            <Text style={[styles.performanceValue, styles.negative]}>
              ${profileState.greatest_loss.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.streakCard}>
          <Text style={styles.streakLabel}>🔥 Current Win Streak</Text>
          <Text style={styles.streakValue}>{profileState.win_streak}</Text>
          <Text style={styles.streakSubtext}>
            {profileState.win_streak > 0 ? "Keep it going!" : "Time to bounce back!"}
          </Text>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>

      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <Text style={styles.modalLabel}>Username</Text>
            <TextInput
              style={styles.modalInput}
              value={editUsername}
              onChangeText={setEditUsername}
              placeholder="Username"
              placeholderTextColor="#666"
            />

            <Text style={styles.modalLabel}>Profile Picture URL</Text>
            <TextInput
              style={styles.modalInput}
              value={editProfilePic}
              onChangeText={setEditProfilePic}
              placeholder="https://..."
              placeholderTextColor="#666"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveProfile}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#007AFF",
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  editButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  balanceCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 8,
  },
  pnlLabel: {
    fontSize: 14,
    color: "#aaa",
  },
  positive: {
    color: "#34C759",
  },
  negative: {
    color: "#FF3B30",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    width: "47%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#aaa",
    textAlign: "center",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  performanceRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  performanceItem: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  performanceLabel: {
    fontSize: 12,
    color: "#aaa",
    marginBottom: 8,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  streakCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  streakLabel: {
    fontSize: 16,
    color: "#aaa",
    marginBottom: 8,
  },
  streakValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 4,
  },
  streakSubtext: {
    fontSize: 12,
    color: "#aaa",
  },
  logoutButton: {
    backgroundColor: "#2a1f1f",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  logoutButtonText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "600",
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
    padding: 20,
    width: "90%",
    borderWidth: 1,
    borderColor: "#333",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#aaa",
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  modalCancelText: {
    color: "#aaa",
    fontSize: 14,
    fontWeight: "600",
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: "#34C759",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  modalSaveText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
