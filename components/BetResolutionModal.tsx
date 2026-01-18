import React, { useState } from "react";
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
import { Bet } from "../types";
import { resolveBet } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

interface BetResolutionModalProps {
  visible: boolean;
  bet: Bet | null;
  onClose: () => void;
  onResolved: () => void;
  isCommissioner?: boolean;
}

export const BetResolutionModal: React.FC<BetResolutionModalProps> = ({
  visible,
  bet,
  onClose,
  onResolved,
  isCommissioner = false,
}) => {
  const { user } = useAuth();
  const [selectedWinner, setSelectedWinner] = useState<string>("");
  const [didHit, setDidHit] = useState<boolean | undefined>(undefined);
  const [isFinished, setIsFinished] = useState(false);
  const [useCommissionerOverride, setUseCommissionerOverride] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!bet) return null;

  const isBetCreator = user?.sub === bet.creator_id;
  const canResolve = isBetCreator || isCommissioner;

  const handleSubmit = async () => {
    if (!isFinished && didHit === undefined) {
      Alert.alert("Error", "Please mark if the bet finished and whether it hit");
      return;
    }

    if (
      isFinished &&
      bet.type !== "target-proximity" &&
      !selectedWinner
    ) {
      Alert.alert("Error", "Please select a winner");
      return;
    }

    setLoading(true);
    try {
      const resolutionMode = useCommissionerOverride && isCommissioner
        ? "commissioner_override"
        : "manual";

      // TODO: Replace with actual API call when backend is ready
      // await resolveBet(bet.id, {
      //   winner: bet.type !== "target-proximity" ? selectedWinner : undefined,
      //   mode: resolutionMode,
      //   did_hit: didHit,
      //   is_finished: isFinished,
      //   note: note.trim() || undefined,
      // });

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

          {/* Bet Status Toggles */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Bet Finished:</Text>
            <Switch
              value={isFinished}
              onValueChange={setIsFinished}
              trackColor={{ false: "#333", true: "#007AFF" }}
              thumbColor="#fff"
            />
          </View>

          {isFinished && (
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

          {isFinished && bet.type !== "target-proximity" && (
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
});
