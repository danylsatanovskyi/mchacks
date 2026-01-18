import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from "react-native";
import { Bet, Wager } from "../types";
import { resolveBet, getBetWagers } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

interface BetResolutionModalProps {
  visible: boolean;
  bet: Bet | null;
  onClose: () => void;
  onResolved: () => void;
  isCommissioner?: boolean;
  commissionerId?: string;
}

export const BetResolutionModal: React.FC<BetResolutionModalProps> = ({
  visible,
  bet,
  onClose,
  onResolved,
  isCommissioner = false,
  commissionerId,
}) => {
  const { user } = useAuth();
  const [selectedWinner, setSelectedWinner] = useState<string>("");
  const [didHit, setDidHit] = useState<boolean | undefined>(undefined);
  const [isFinished, setIsFinished] = useState(false);
  const [useCommissionerOverride, setUseCommissionerOverride] = useState(false);
  const [targetResult, setTargetResult] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [commissionerWager, setCommissionerWager] = useState<Wager | null>(null);

  useEffect(() => {
    const loadCommissionerWager = async () => {
      if (bet && isCommissioner && commissionerId) {
        try {
          const wagers = await getBetWagers(bet.id);
          const commWager = wagers.find(w => w.user_id === commissionerId);
          setCommissionerWager(commWager || null);
        } catch (error) {
          console.error("Error loading commissioner wager:", error);
        }
      }
    };
    
    if (visible && bet) {
      loadCommissionerWager();
    }
  }, [visible, bet, isCommissioner, commissionerId]);

  if (!bet) return null;

  const isBetCreator = user?.sub === bet.creator_id;
  const canResolve = isBetCreator || isCommissioner;

  const handleSubmit = async () => {
    if (isCommissioner && !commissionerId) {
      Alert.alert("Error", "Commissioner ID not provided");
      return;
    }

    // For commissioner, only need didHit
    if (isCommissioner) {
      if (didHit === undefined) {
        Alert.alert("Error", "Please mark if the bet hit");
        return;
      }
      if (!commissionerWager) {
        Alert.alert("Error", "Commissioner must place a wager before resolving");
        return;
      }
    } else {
      // For bet creator, need all fields
      if (!isFinished && didHit === undefined) {
        Alert.alert("Error", "Please mark if the bet finished and whether it hit");
        return;
      }

      if (isFinished && bet.type !== "target-proximity" && !selectedWinner) {
        Alert.alert("Error", "Please select a winner");
        return;
      }
      if (isFinished && bet.type === "target-proximity" && !targetResult.trim()) {
        Alert.alert("Error", "Please enter the final target value");
        return;
      }
    }

    setLoading(true);
    try {
      const resolutionMode = useCommissionerOverride && isCommissioner
        ? "commissioner_override"
        : "manual";

      // For commissioner, use their wager selection as the winner
      let winner: string;
      if (isCommissioner && commissionerWager) {
        if (bet.type === "target-proximity") {
          // For target-proximity, if it hit, use the commissioner's guess, otherwise need actual value
          if (didHit) {
            winner = commissionerWager.selection;
          } else {
            if (!targetResult.trim()) {
              Alert.alert("Error", "Please enter the actual target value since it didn't hit");
              setLoading(false);
              return;
            }
            winner = targetResult.trim();
          }
        } else {
          // For other bet types, if it hit, use commissioner's selection, otherwise use the other option
          if (didHit) {
            winner = commissionerWager.selection;
          } else {
            // Find the option that wasn't selected by commissioner
            const otherOption = bet.options.find(opt => opt !== commissionerWager.selection);
            winner = otherOption || bet.options[0];
          }
        }
      } else {
        // For bet creator, use selected winner or target result
        winner = bet.type === "target-proximity"
          ? targetResult.trim()
          : selectedWinner;
      }

      await resolveBet(bet.id, {
        winner,
        mode: resolutionMode,
        did_hit: didHit,
        is_finished: isFinished || isCommissioner, // Commissioner resolution means it's finished
        note: note.trim() || undefined,
      });

      Alert.alert("Success", "Bet resolved successfully!");
      onResolved();
      onClose();
    } catch (error) {
      console.error("Error resolving bet:", error);
      Alert.alert("Error", "Failed to resolve bet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Resolve Bet</Text>
          <Text style={styles.betTitle}>{bet.title}</Text>

          {!canResolve && (
            <View style={styles.permissionNotice}>
              <Text style={styles.permissionNoticeText}>
                Only the bet creator or commissioner can resolve this bet.
              </Text>
            </View>
          )}

          {isCommissioner && commissionerWager && (
            <View style={styles.commissionerInfo}>
              <Text style={styles.commissionerInfoText}>
                Your selection: {commissionerWager.selection}
              </Text>
            </View>
          )}

          {/* Bet Status Toggles - only show for bet creator */}
          {!isCommissioner && (
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Bet Finished:</Text>
              <Switch
                value={isFinished}
                onValueChange={setIsFinished}
                trackColor={{ false: "#333", true: "#007AFF" }}
                thumbColor="#fff"
              />
            </View>
          )}

          {(isFinished || isCommissioner) && (
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Did it Hit:</Text>
              <View style={styles.hitToggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.hitToggleButton,
                    didHit === true && styles.hitToggleButtonActive,
                  ]}
                  onPress={() => setDidHit(true)}
                >
                  <Text
                    style={[
                      styles.hitToggleText,
                      didHit === true && styles.hitToggleTextActive,
                    ]}
                  >
                    ✅ Hit
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.hitToggleButton,
                    didHit === false && styles.hitToggleButtonActiveMiss,
                  ]}
                  onPress={() => setDidHit(false)}
                >
                  <Text
                    style={[
                      styles.hitToggleText,
                      didHit === false && styles.hitToggleTextActiveMiss,
                    ]}
                  >
                    ❌ Miss
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isCommissioner && (
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Commissioner Override:</Text>
              <Switch
                value={useCommissionerOverride}
                onValueChange={setUseCommissionerOverride}
                trackColor={{ false: "#333", true: "#FFD700" }}
                thumbColor="#fff"
              />
            </View>
          )}

          {isCommissioner && !didHit && bet.type === "target-proximity" && (
            <View>
              <Text style={styles.label}>Actual Target Value (since it didn't hit):</Text>
              <TextInput
                style={styles.noteInput}
                value={targetResult}
                onChangeText={setTargetResult}
                placeholder="e.g., 120"
                keyboardType="numeric"
                placeholderTextColor="#666"
              />
            </View>
          )}

          {!isCommissioner && isFinished && bet.type === "target-proximity" && (
            <View>
              <Text style={styles.label}>Final Target Value:</Text>
              <TextInput
                style={styles.noteInput}
                value={targetResult}
                onChangeText={setTargetResult}
                placeholder="e.g., 120"
                keyboardType="numeric"
                placeholderTextColor="#666"
              />
            </View>
          )}

          {!isCommissioner && isFinished && bet.type !== "target-proximity" && (
            <View>
              <Text style={styles.label}>Select Winner:</Text>
              {bet.options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    selectedWinner === option && styles.optionButtonSelected,
                  ]}
                  onPress={() => setSelectedWinner(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedWinner === option && styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Note (optional):</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Add a note about the resolution..."
            multiline
            numberOfLines={3}
            placeholderTextColor="#666"
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (loading || !canResolve) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading || !canResolve}
            >
              <Text style={styles.submitButtonText}>
                {loading ? "Resolving..." : "Resolve"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
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
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "#333",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#fff",
  },
  betTitle: {
    fontSize: 16,
    color: "#aaa",
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 8,
    color: "#fff",
  },
  optionButton: {
    backgroundColor: "#2a2a2a",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#333",
  },
  optionButtonSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#1a2a3a",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  optionTextSelected: {
    color: "#007AFF",
  },
  noteInput: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 24,
    textAlignVertical: "top",
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#aaa",
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#34C759",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#555",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingVertical: 8,
  },
  permissionNotice: {
    backgroundColor: "#2a1f1f",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  permissionNoticeText: {
    color: "#FF3B30",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  hitToggleContainer: {
    flexDirection: "row",
    gap: 8,
  },
  hitToggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2a2a2a",
    borderWidth: 2,
    borderColor: "#333",
  },
  hitToggleButtonActive: {
    borderColor: "#34C759",
    backgroundColor: "#1a3a1a",
  },
  hitToggleButtonActiveMiss: {
    borderColor: "#FF3B30",
    backgroundColor: "#3a1a1a",
  },
  hitToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#aaa",
  },
  hitToggleTextActive: {
    color: "#34C759",
  },
  hitToggleTextActiveMiss: {
    color: "#FF3B30",
  },
  commissionerInfo: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  commissionerInfoText: {
    color: "#FFD700",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
