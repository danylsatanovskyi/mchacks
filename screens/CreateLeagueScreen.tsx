import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

export const CreateLeagueScreen: React.FC<{ onLeagueCreated: () => void }> = ({
  onLeagueCreated,
}) => {
  const { user } = useAuth();
  const [leagueName, setLeagueName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!leagueName.trim()) {
      Alert.alert("Error", "Please enter a league name");
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // await createLeague({
      //   name: leagueName.trim(),
      //   commissioner_id: user?.sub,
      // });

      Alert.alert("Success", "League created successfully!", [
        {
          text: "OK",
          onPress: () => {
            setLeagueName("");
            onLeagueCreated();
          },
        },
      ]);
    } catch (error) {
      console.error("Error creating league:", error);
      Alert.alert("Error", "Failed to create league");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create New League</Text>
      <Text style={styles.subtitle}>
        Create a private betting league for you and your friends
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>League Name</Text>
        <TextInput
          style={styles.input}
          value={leagueName}
          onChangeText={setLeagueName}
          placeholder="e.g., Office Champions League"
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ League Details</Text>
        <Text style={styles.infoText}>
          • You will be the commissioner (judge) of this league
        </Text>
        <Text style={styles.infoText}>
          • You can invite friends and manage members
        </Text>
        <Text style={styles.infoText}>
          • As commissioner, you can override bet resolutions if needed
        </Text>
        <Text style={styles.infoText}>
          • An invite code will be generated after creation
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.createButton, loading && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        <Text style={styles.createButtonText}>
          {loading ? "Creating..." : "Create League"}
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#aaa",
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
  },
  infoBox: {
    backgroundColor: "#1a252a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderLeftWidth: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 8,
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: "#34C759",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  createButtonDisabled: {
    backgroundColor: "#555",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
