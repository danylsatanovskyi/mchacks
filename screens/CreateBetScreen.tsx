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
import { getEvents, refreshEvents, fetchEventsForDate, createBet } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export const CreateBetScreen: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [betType, setBetType] = useState<BetType>("moneyline");
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [stake, setStake] = useState("10");
  const [eventDate, setEventDate] = useState("2026-01-18");
  const [includePastEvents, setIncludePastEvents] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsSourceDate, setEventsSourceDate] = useState<string | null>(null);
  const [noEventsForDate, setNoEventsForDate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshingEvents, setRefreshingEvents] = useState(false);
  const { profile } = useAuth();

  const isValidDateString = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isPastDate = (value: string) => {
    if (!isValidDateString(value)) return false;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const date = new Date(`${value}T00:00:00`);
    return date < startOfToday;
  };

  useEffect(() => {
    if (isValidDateString(eventDate)) {
      if (isPastDate(eventDate)) {
        setIncludePastEvents(true);
      }
      loadEvents();
    }
  }, [eventDate, includePastEvents]);

  const loadEvents = async () => {
    try {
      const customEvent: Event = {
        id: "eventcustom",
        category: "custom",
        title: "Custom Event",
        status: "upcoming",
      };

      const statusFilter = includePastEvents || isPastDate(eventDate) ? undefined : "upcoming";
      // Try to fetch events for the selected date first
      let data = await getEvents({ status: statusFilter, date: eventDate });
      if (data.length > 0) {
        setNoEventsForDate(false);
        setEventsSourceDate(null);
        setEvents([customEvent, ...data]);
        return;
      }

      // Fetch fixtures for the selected date and retry
      await fetchEventsForDate(eventDate);
      data = await getEvents({ status: statusFilter, date: eventDate });
      if (data.length > 0) {
        setNoEventsForDate(false);
        setEventsSourceDate(null);
        setEvents([customEvent, ...data]);
        return;
      }

      // Fallback: search forward up to 30 days for any upcoming events
      const baseDate = new Date(`${eventDate}T00:00:00`);
      for (let i = 1; i <= 30; i += 1) {
        const nextDate = new Date(baseDate);
        nextDate.setDate(baseDate.getDate() + i);
        const nextDateStr = formatDate(nextDate);
        await fetchEventsForDate(nextDateStr);
        const nextData = await getEvents({ status: statusFilter, date: nextDateStr });
        if (nextData.length > 0) {
          setNoEventsForDate(true);
          setEventsSourceDate(nextDateStr);
          setEvents([customEvent, ...nextData]);
          return;
        }
      }

      // If still nothing, search backward up to 30 days for any events (past)
      for (let i = 1; i <= 30; i += 1) {
        const prevDate = new Date(baseDate);
        prevDate.setDate(baseDate.getDate() - i);
        const prevDateStr = formatDate(prevDate);
        await fetchEventsForDate(prevDateStr);
        const prevData = await getEvents({ status: undefined, date: prevDateStr });
        if (prevData.length > 0) {
          setNoEventsForDate(true);
          setIncludePastEvents(true);
          setEventsSourceDate(prevDateStr);
          setEvents([customEvent, ...prevData]);
          return;
        }
      }

      // If still nothing, at least show the custom event
      setNoEventsForDate(true);
      setEventsSourceDate(null);
      setEvents([customEvent]);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const handleRefreshEvents = async () => {
    if (!isValidDateString(eventDate)) {
      Alert.alert("Error", "Enter a date as YYYY-MM-DD");
      return;
    }
    try {
      setRefreshingEvents(true);
      await fetchEventsForDate(eventDate);
      await loadEvents();
    } catch (error) {
      console.error("Error refreshing sports events:", error);
      Alert.alert("Error", "Failed to refresh sports events");
    } finally {
      setRefreshingEvents(false);
    }
  };

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    setTitle("");
    if (event.category === "sports" && event.teams && event.teams.length >= 2) {
      setBetType("moneyline");
      setOptions([event.teams[0], event.teams[1]]);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    if (selectedEvent?.category === "sports") return;
    if (betType === "n-way-moneyline" && options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (selectedEvent?.category === "sports") return;
    if (betType === "n-way-moneyline" && options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleBetTypeChange = (type: BetType) => {
    if (selectedEvent?.category === "sports") {
      return;
    }
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
    } else if (stakeAmount > 25) {
      Alert.alert("Error", "Maximum stake allowed is $25");
      return;
    } else if (profile && stakeAmount > profile.current_balance) {
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
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Select Event</Text>
        <TouchableOpacity
          style={[styles.refreshButton, refreshingEvents && styles.refreshButtonDisabled]}
          onPress={handleRefreshEvents}
          disabled={refreshingEvents}
        >
          <Text style={styles.refreshButtonText}>
            {refreshingEvents ? "Refreshing..." : "Refresh Sports"}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Event Date (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        value={eventDate}
        onChangeText={setEventDate}
        placeholder="2026-01-18"
        placeholderTextColor="#666"
        autoCapitalize="none"
      />
      {noEventsForDate && !eventsSourceDate && (
        <Text style={styles.helperText}>
          No fixtures returned for {eventDate}. Try another date.
        </Text>
      )}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIncludePastEvents((prev) => !prev)}
      >
        <Text style={styles.toggleButtonText}>
          {includePastEvents ? "Showing past events" : "Show past events"}
        </Text>
      </TouchableOpacity>
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
                {event.start_time && (
                  <Text style={styles.eventTime}>
                    {new Date(event.start_time).toLocaleString()}
                  </Text>
                )}
                {event.status === "finished" ? (
                  <>
                    <Text style={styles.pastEventLabel}>Past event</Text>
                    {event.result?.score && (
                      <Text style={styles.eventScore}>Final: {event.result.score}</Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.eventStatus}>{event.status}</Text>
                )}
              </>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      {eventsSourceDate && (
        <Text style={styles.helperText}>
          Showing events from {eventsSourceDate} (closest with data)
        </Text>
      )}

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
            editable={selectedEvent?.category !== "sports"}
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
      <Text style={styles.helperText}>Max stake: $25</Text>

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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  refreshButton: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#333",
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
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
  eventTime: {
    fontSize: 11,
    color: "#888",
    marginBottom: 4,
  },
  eventStatus: {
    fontSize: 12,
    color: "#aaa",
  },
  pastEventLabel: {
    fontSize: 12,
    color: "#FF9500",
    fontWeight: "600",
    marginTop: 4,
  },
  eventScore: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    marginTop: 2,
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
  helperText: {
    fontSize: 12,
    color: "#888",
    marginTop: 6,
    marginBottom: 8,
  },
  toggleButton: {
    alignSelf: "flex-start",
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 8,
  },
  toggleButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
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
