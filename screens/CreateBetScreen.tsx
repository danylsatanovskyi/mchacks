import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { BetType, Event } from "../types";
import { getEvents, createBet } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export const CreateBetScreen: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [betType, setBetType] = useState<BetType>("moneyline");
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [stake, setStake] = useState("10");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await getEvents({ status: "upcoming" });
      const customEvent: Event = {
        id: "eventcustom",
        category: "custom",
        title: "Custom Event",
        status: "upcoming",
      };
      setEvents([customEvent, ...data]);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    setTitle("");
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (betType === "n-way-moneyline" && options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (betType === "n-way-moneyline" && options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleBetTypeChange = (type: BetType) => {
    setBetType(type);
    if (type === "moneyline") {
      setOptions(["", ""]);
    } else if (type === "n-way-moneyline") {
      setOptions(options.length < 2 ? ["", ""] : options);
    } else if (type === "target-proximity") {
      setOptions([""]); // Single option for target proximity
    }
  };

  const handleSubmit = async () => {
    if (!selectedEvent) {
      Alert.alert("Error", "Please select an event");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Error", "Please enter a bet title");
      return;
    }

    const validOptions = options.filter((opt) => opt.trim());
    if (betType === "moneyline" && validOptions.length < 2) {
      Alert.alert("Error", "Please enter 2 options for moneyline");
      return;
    }

    if (betType === "n-way-moneyline" && validOptions.length < 2) {
      Alert.alert("Error", "Please enter at least 2 options");
      return;
    }

    if (betType === "target-proximity" && validOptions.length < 1) {
      Alert.alert("Error", "Please enter a target value");
      return;
    }

    const stakeAmount = parseFloat(stake);
    if (isNaN(stakeAmount) || stakeAmount <= 0) {
      Alert.alert("Error", "Please enter a valid stake amount");
      return;
    } else if (stakeAmount >= 25) {
      Alert.alert("Error", "Maximum stake allowed is 25 units");
      return;
    } else if (stakeAmount > user?.currentBalance) {
      Alert.alert("Error", "Insufficient balance");
      return;
    }

    setLoading(true);
    try {
      await createBet({
        event_id: selectedEvent.id,
        group_id: "league1", // TODO: Get from user's current league
        type: betType,
        title: title.trim(),
        options: validOptions,
        stake: stakeAmount,
      });

      Alert.alert("Success", "Bet created successfully!");
      // Reset form
      setTitle("");
      setOptions(["", ""]);
      setStake("10");
      setSelectedEvent(null);
    } catch (error) {
      console.error("Error creating bet:", error);
      Alert.alert("Error", "Failed to create bet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Select Event</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.eventScroll}
      >
        {events.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={[
              styles.eventCard,
              selectedEvent?.id === event.id && styles.eventCardSelected,
            ]}
            onPress={() => handleEventSelect(event)}
          >
            {event.category === "custom" ? (
              <>
                <View style={styles.eventPlusContainer}>
                  <Text style={styles.eventPlus}>+</Text>
                </View>
                <Text style={styles.eventLeague}>Custom Event</Text>
              </>
            ) : (
              <>
                <Text style={styles.eventLeague}>{event.league}</Text>
                <Text style={styles.eventTeams}>
                  {event.teams?.join(" vs ")}
                </Text>
                <Text style={styles.eventStatus}>{event.status}</Text>
              </>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>Bet Type</Text>
      <View style={styles.betTypeContainer}>
        <TouchableOpacity
          style={[
            styles.betTypeButton,
            betType === "moneyline" && styles.betTypeButtonActive,
          ]}
          onPress={() => handleBetTypeChange("moneyline")}
        >
          <Text
            style={[
              styles.betTypeText,
              betType === "moneyline" && styles.betTypeTextActive,
            ]}
          >
            Moneyline
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.betTypeButton,
            betType === "n-way-moneyline" && styles.betTypeButtonActive,
          ]}
          onPress={() => handleBetTypeChange("n-way-moneyline")}
        >
          <Text
            style={[
              styles.betTypeText,
              betType === "n-way-moneyline" && styles.betTypeTextActive,
            ]}
          >
            n-Way Moneyline
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.betTypeButton,
            betType === "target-proximity" && styles.betTypeButtonActive,
          ]}
          onPress={() => handleBetTypeChange("target-proximity")}
        >
          <Text
            style={[
              styles.betTypeText,
              betType === "target-proximity" && styles.betTypeTextActive,
            ]}
          >
            Target Proximity
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Bet Title</Text>

      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder={
          betType === "target-proximity"
            ? "e.g., What will the score be?"
            : "e.g., Who will win?"
        }
        placeholderTextColor="#666"
      />

      <Text style={styles.sectionTitle}>Options</Text>
      {options.map((option, index) => (
        <View key={`bet-option-${index}`} style={styles.optionRow}>
          <TextInput
            style={styles.optionInput}
            value={option}
            onChangeText={(value) => handleOptionChange(index, value)}
            placeholder={
              betType === "target-proximity"
                ? "Target value"
                : `Option ${index + 1}`
            }
            placeholderTextColor="#666"
          />
          {options.length > 2 && (
            <TouchableOpacity onPress={() => removeOption(index)}>
              <Text style={styles.removeButton}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {betType === "n-way-moneyline" && options.length < 10 && (
        <TouchableOpacity style={styles.addButton} onPress={addOption}>
          <Text style={styles.addButtonText}>+ Add Option</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Stake (Fixed)</Text>
      <TextInput
        style={styles.input}
        value={stake}
        onChangeText={setStake}
        keyboardType="numeric"
        placeholder="10"
        placeholderTextColor="#666"
      />

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? "Creating..." : "Place Bet"}
        </Text>
      </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    color: "#fff",
  },
  eventScroll: {
    marginBottom: 8,
  },
  eventCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    minWidth: 150,
    borderWidth: 2,
    borderColor: "#333",
  },
  eventCardSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#252525",
  },
  eventPlusContainer: {
    width: 24,
    height: 24,
    borderRadius: 15,
    borderWidth: 0.5,
    borderColor: "#007AFF",
    marginBottom: 4,
    position: "relative",
  },
  eventPlus: {
    fontSize: 18,
    fontWeight: "300",
    color: "#007AFF",
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -5.5 }, { translateY: -11.75 }],
  },
  eventLeague: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 4,
  },
  eventTeams: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    color: "#fff",
  },
  eventStatus: {
    fontSize: 12,
    color: "#aaa",
  },
  customTypeButton: {
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  customTypeButtonActive: {
    borderColor: "#007AFF",
    backgroundColor: "#1a2a3a",
  },
  customTypeText: {
    fontSize: 12,
    color: "#aaa",
    fontWeight: "600",
  },
  customTypeTextActive: {
    color: "#007AFF",
  },
  betTypeContainer: {
    flexDirection: "row",
    gap: 8,
  },
  betTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#1e1e1e",
    borderWidth: 2,
    borderColor: "#333",
    alignItems: "center",
  },
  betTypeButtonActive: {
    borderColor: "#007AFF",
    backgroundColor: "#1a2a3a",
  },
  betTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#aaa",
  },
  betTypeTextActive: {
    color: "#007AFF",
  },
  input: {
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  optionInput: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
  },
  removeButton: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#34C759",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: "#555",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
