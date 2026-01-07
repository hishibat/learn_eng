import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useWords } from "../hooks/useWords";
import { useTags } from "../hooks/useTags";
import { ImportWordInput } from "../types/database";

interface EditableWord extends ImportWordInput {
  isEditing: boolean;
  isDuplicate: boolean;
  skipImport: boolean;
}

export default function ImportPreviewScreen() {
  const params = useLocalSearchParams<{ words: string }>();
  const { words: existingWords, createWord } = useWords();
  const { tags, createTag } = useTags();

  const [editableWords, setEditableWords] = useState<EditableWord[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    if (params.words) {
      try {
        const parsed: ImportWordInput[] = JSON.parse(params.words);
        const withEditState = parsed.map((w) => ({
          ...w,
          isEditing: false,
          isDuplicate: existingWords.some(
            (ew) => ew.word.toLowerCase() === w.word.toLowerCase()
          ),
          skipImport: false,
        }));
        setEditableWords(withEditState);
      } catch (e) {
        console.error("Failed to parse words:", e);
        Alert.alert("Error", "Failed to load data");
        router.back();
      }
    }
  }, [params.words, existingWords]);

  const toggleEdit = (index: number) => {
    setEditableWords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isEditing: !updated[index].isEditing };
      return updated;
    });
  };

  const updateWord = (index: number, field: keyof ImportWordInput, value: string) => {
    setEditableWords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "word") {
        updated[index].isDuplicate = existingWords.some(
          (ew) => ew.word.toLowerCase() === value.toLowerCase()
        );
      }
      return updated;
    });
  };

  const toggleSkip = (index: number) => {
    setEditableWords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], skipImport: !updated[index].skipImport };
      return updated;
    });
  };

  const removeWord = (index: number) => {
    setEditableWords((prev) => prev.filter((_, i) => i !== index));
  };

  const getDateTag = (): string => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d + "_import";
  };

  const handleSaveAll = async () => {
    const wordsToSave = editableWords.filter((w) => !w.skipImport);

    if (wordsToSave.length === 0) {
      Alert.alert("Info", "No words to register");
      return;
    }

    const duplicates = wordsToSave.filter((w) => w.isDuplicate);
    if (duplicates.length > 0) {
      Alert.alert(
        "Duplicates Found",
        duplicates.length + " duplicates found. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: () => performSave(wordsToSave) },
        ]
      );
    } else {
      performSave(wordsToSave);
    }
  };

  const performSave = async (wordsToSave: EditableWord[]) => {
    setSaving(true);
    setSavedCount(0);

    try {
      const dateTagName = getDateTag();
      let dateTag: any = tags.find((t) => t.name === dateTagName);

      if (!dateTag) {
        dateTag = await createTag({ name: dateTagName, color: "#10B981" });
      }

      let successCount = 0;
      for (const word of wordsToSave) {
        const result = await createWord({
          word: word.word,
          meaning: word.meaning,
          pronunciation: word.pronunciation,
          tag_ids: dateTag ? [dateTag.id] : [],
        });

        if (result) {
          successCount++;
          setSavedCount(successCount);
        }
      }

      Alert.alert("Done", successCount + " words registered", [
        { text: "OK", onPress: () => router.replace("/(tabs)/words") },
      ]);
    } catch (error) {
      console.error("Error saving words:", error);
      Alert.alert("Error", "Failed to save words");
    } finally {
      setSaving(false);
    }
  };

  const wordsToImport = editableWords.filter((w) => !w.skipImport).length;

  return (
    <>
      <Stack.Screen options={{ title: "Review Results", headerBackTitle: "Back" }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>{editableWords.length} words extracted</Text>
          <Text style={styles.subHeaderText}>To register: {wordsToImport}</Text>
        </View>

        <ScrollView style={styles.wordList} contentContainerStyle={styles.wordListContent}>
          {editableWords.map((word, index) => (
            <View
              key={index}
              style={[
                styles.wordCard,
                word.skipImport && styles.wordCardSkipped,
                word.isDuplicate && !word.skipImport && styles.wordCardDuplicate,
              ]}
            >
              {word.isDuplicate && !word.skipImport && (
                <View style={styles.duplicateBadge}>
                  <Text style={styles.duplicateBadgeText}>Duplicate</Text>
                </View>
              )}

              {word.isEditing ? (
                <View style={styles.editForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Word</Text>
                    <TextInput
                      style={styles.input}
                      value={word.word}
                      onChangeText={(v) => updateWord(index, "word", v)}
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Meaning</Text>
                    <TextInput
                      style={styles.input}
                      value={word.meaning}
                      onChangeText={(v) => updateWord(index, "meaning", v)}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Pronunciation</Text>
                    <TextInput
                      style={styles.input}
                      value={word.pronunciation || ""}
                      onChangeText={(v) => updateWord(index, "pronunciation", v)}
                      placeholder="(optional)"
                    />
                  </View>
                  <TouchableOpacity style={styles.doneButton} onPress={() => toggleEdit(index)}>
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.wordContent}>
                  <View style={styles.wordInfo}>
                    <Text style={[styles.wordText, word.skipImport && styles.textSkipped]}>{word.word}</Text>
                    {word.pronunciation && (
                      <Text style={[styles.pronunciationText, word.skipImport && styles.textSkipped]}>{word.pronunciation}</Text>
                    )}
                    <Text style={[styles.meaningText, word.skipImport && styles.textSkipped]}>{word.meaning}</Text>
                  </View>
                  <View style={styles.wordActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => toggleEdit(index)}>
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => toggleSkip(index)}>
                      <Text style={styles.actionButtonText}>{word.skipImport ? "Include" : "Skip"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => removeWord(index)}>
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          {saving ? (
            <View style={styles.savingContainer}>
              <ActivityIndicator color="#4F46E5" />
              <Text style={styles.savingText}>Saving... ({savedCount}/{wordsToImport})</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.saveButton, wordsToImport === 0 && styles.saveButtonDisabled]}
              onPress={handleSaveAll}
              disabled={wordsToImport === 0}
            >
              <Text style={styles.saveButtonText}>Register {wordsToImport} words</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: { backgroundColor: "#fff", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e5e5" },
  headerText: { fontSize: 16, fontWeight: "600", color: "#333" },
  subHeaderText: { fontSize: 14, color: "#666", marginTop: 4 },
  wordList: { flex: 1 },
  wordListContent: { padding: 16, gap: 12 },
  wordCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, position: "relative" },
  wordCardSkipped: { backgroundColor: "#f3f4f6", opacity: 0.7 },
  wordCardDuplicate: { borderWidth: 2, borderColor: "#F59E0B" },
  duplicateBadge: { position: "absolute", top: -8, right: 12, backgroundColor: "#F59E0B", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  duplicateBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  wordContent: { flexDirection: "row", justifyContent: "space-between" },
  wordInfo: { flex: 1, marginRight: 12 },
  wordText: { fontSize: 18, fontWeight: "600", color: "#333" },
  pronunciationText: { fontSize: 14, color: "#666", marginTop: 2 },
  meaningText: { fontSize: 14, color: "#666", marginTop: 4 },
  textSkipped: { textDecorationLine: "line-through", color: "#9CA3AF" },
  wordActions: { justifyContent: "center", gap: 8 },
  actionButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: "#f3f4f6" },
  actionButtonText: { fontSize: 12, color: "#4F46E5", fontWeight: "500" },
  deleteButton: { backgroundColor: "#FEE2E2" },
  deleteButtonText: { fontSize: 12, color: "#DC2626", fontWeight: "500" },
  editForm: { gap: 12 },
  inputGroup: { gap: 4 },
  inputLabel: { fontSize: 12, color: "#666", fontWeight: "500" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, fontSize: 16 },
  doneButton: { backgroundColor: "#4F46E5", padding: 12, borderRadius: 8, alignItems: "center" },
  doneButtonText: { color: "#fff", fontWeight: "600" },
  footer: { backgroundColor: "#fff", padding: 16, borderTopWidth: 1, borderTopColor: "#e5e5e5" },
  savingContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12 },
  savingText: { fontSize: 16, color: "#666" },
  saveButton: { backgroundColor: "#4F46E5", padding: 16, borderRadius: 10, alignItems: "center" },
  saveButtonDisabled: { backgroundColor: "#9CA3AF" },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
