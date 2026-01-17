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

// Dummy events for development
const dummyEvents: Event[] = [
  {
    id: "event1",
    league: "NBA",
    teams: ["Lakers", "Warriors"],
    start_time: new Date().toISOString(),
    status: "upcoming",
  },
  {
    id: "event2",
    league: "Formula 1",
    teams: ["Hamilton", "Verstappen", "Leclerc"],
    start_time: new Date().toISOString(),
    status: "upcoming",
  },
];

export const CreateBetScreen: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [betType, setBetType] = useState<BetType>("binary");
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [stake, setStake] = useState("10");
  const [events, setEvents] = useState<Event[]>(dummyEvents);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      // TODO: Replace with actual API call when backend is ready
      // const data = await getEvents({ status: "upcoming" });
      // setEvents(data);
      console.log("Loading events...");
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (betType === "ranked" && options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleBetTypeChange = (type: BetType) => {
    setBetType(type);
    if (type === "binary") {
      setOptions(["", ""]);
    } else if (type === "ranked" && options.length < 3) {
      setOptions(["", "", ""]);
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
    if (validOptions.length < 2) {
      Alert.alert("Error", "Please enter at least 2 options");
      return;
    }

    const stakeAmount = parseFloat(stake);
    if (isNaN(stakeAmount) || stakeAmount <= 0) {
      Alert.alert("Error", "Please enter a valid stake amount");
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual API call when backend is ready
      // await createBet({
      //   event_id: selectedEvent.id,
      //   type: betType,
      //   title: title.trim(),
      //   options: validOptions,
      //   stake: stakeAmount,
      // });
      
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventScroll}>
        {events.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={[
              styles.eventCard,
              selectedEvent?.id === event.id && styles.eventCardSelected,
            ]}
            onPress={() => setSelectedEvent(event)}
          >
            <Text style={styles.eventLeague}>{event.league}</Text>
            <Text style={styles.eventTeams}>{event.teams.join(" vs ")}</Text>
            <Text style={styles.eventStatus}>{event.status}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionTitle}>Bet Type</Text>
      <View style={styles.betTypeContainer}>
        <TouchableOpacity
          style={[styles.betTypeButton, betType === "binary" && styles.betTypeButtonActive]}
          onPress={() => handleBetTypeChange("binary")}
        >
          <Text style={[styles.betTypeText, betType === "binary" && styles.betTypeTextActive]}>
            Binary
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.betTypeButton, betType === "ranked" && styles.betTypeButtonActive]}
          onPress={() => handleBetTypeChange("ranked")}
        >
          <Text style={[styles.betTypeText, betType === "ranked" && styles.betTypeTextActive]}>
            Ranked (1st/2nd/3rd)
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Bet Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g., Who will win?"
        placeholderTextColor="#666"
      />

      <Text style={styles.sectionTitle}>Options</Text>
      {options.map((option, index) => (
        <View key={index} style={styles.optionRow}>
          <TextInput
            style={styles.optionInput}
            value={option}
            onChangeText={(value) => handleOptionChange(index, value)}
            placeholder={`Option ${index + 1}`}
            placeholderTextColor="#666"
          />
          {options.length > 2 && (
            <TouchableOpacity onPress={() => removeOption(index)}>
              <Text style={styles.removeButton}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {betType === "ranked" && options.length < 10 && (
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
    fontSize: 14,
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
