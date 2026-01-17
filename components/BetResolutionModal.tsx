import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Bet } from "../types";
import { resolveBet } from "../services/api";

interface BetResolutionModalProps {
  visible: boolean;
  bet: Bet | null;
  onClose: () => void;
  onResolved: () => void;
}

export const BetResolutionModal: React.FC<BetResolutionModalProps> = ({
  visible,
  bet,
  onClose,
  onResolved,
}) => {
  const [selectedWinner, setSelectedWinner] = useState<string>("");
  const [selectedRankings, setSelectedRankings] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!bet) return null;

  const handleRankingSelect = (option: string, position: number) => {
    const newRankings = [...selectedRankings];
    newRankings[position] = option;
    setSelectedRankings(newRankings);
  };

  const handleSubmit = async () => {
    if (bet.type === "binary" && !selectedWinner) {
      Alert.alert("Error", "Please select a winner");
      return;
    }

    if (bet.type === "ranked") {
      const uniqueRankings = [...new Set(selectedRankings.filter((r) => r))];
      if (uniqueRankings.length !== 3) {
        Alert.alert("Error", "Please select exactly 3 different rankings");
        return;
      }
    }

    setLoading(true);
    try {
      // TODO: Replace with actual API call when backend is ready
      // await resolveBet(bet.id, {
      //   winner: bet.type === "binary" ? selectedWinner : undefined,
      //   rankings: bet.type === "ranked" ? selectedRankings : undefined,
      //   mode: "manual",
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

          {bet.type === "binary" ? (
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
          ) : (
            <View>
              <Text style={styles.label}>Select Rankings:</Text>
              {["1st", "2nd", "3rd"].map((position, index) => (
                <View key={position} style={styles.rankingRow}>
                  <Text style={styles.positionLabel}>{position}:</Text>
                  {bet.options.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionButtonSmall,
                        selectedRankings[index] === option &&
                          styles.optionButtonSelected,
                      ]}
                      onPress={() => handleRankingSelect(option, index)}
                    >
                      <Text
                        style={[
                          styles.optionTextSmall,
                          selectedRankings[index] === option &&
                            styles.optionTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
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
  optionButtonSmall: {
    backgroundColor: "#2a2a2a",
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: "#333",
  },
  optionTextSmall: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  rankingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  positionLabel: {
    fontSize: 16,
    fontWeight: "600",
    width: 40,
    marginRight: 8,
    color: "#fff",
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
});
