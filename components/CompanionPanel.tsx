import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  useWindowDimensions,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import ReaderSettingsModal from "./ReaderSettingsModal";

interface PageInsight {
  summary?: string;
  uncommon_words?: Array<{
    word: string;
    definition: string;
    grade_level: string;
  }>;
  contextual_insights?: Array<{ subject: string; insight: string }>;
}

interface CompanionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  data: PageInsight | null;
}

// Lowered from 48 to 40 to bring the closed peek section down slightly
const PEEK_HEIGHT = 40;

export default function CompanionPanel({
  isOpen,
  onClose,
  isLoading,
  data,
}: CompanionPanelProps) {
  const { height } = useWindowDimensions();
  const [settingsVisible, setSettingsVisible] = useState(false);

  const PANEL_HEIGHT = height * 0.55;
  const OPEN_Y = 0;
  const CLOSED_Y = PANEL_HEIGHT - PEEK_HEIGHT + 12;

  const translateY = useSharedValue(CLOSED_Y);

  useEffect(() => {
    translateY.value = withSpring(isOpen ? OPEN_Y : CLOSED_Y, {
      damping: 24,
      stiffness: 180,
    });
    if (!isOpen) {
      setSettingsVisible(false);
    }
  }, [isOpen, height]);

  useEffect(() => {
    console.log(
      "DEBUG [Panel]: Data prop changed. New data length:",
      data ? Object.keys(data).length : "null",
    );
  }, [data]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Inside CompanionPanel.tsx, just before the return:
  console.log("DEBUG [Panel]: Render cycle start.");
  console.log("DEBUG [Panel]: Currently rendering summary text:", data?.summary?.substring(0, 20) || "No summary");

  return (
    <Animated.View
      style={[styles.panel, { height: PANEL_HEIGHT }, animatedStyle]}
    >
      {/* Settings Modal Instance */}
      <ReaderSettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      {/* Static Header Row */}
      <View style={[styles.headerRow, { height: PEEK_HEIGHT }]}>
        <View style={styles.sideButtonSpacer} />

        <TouchableOpacity
          style={styles.handleBar}
          onPress={onClose}
          activeOpacity={0.9}
        >
          <Text style={styles.handleText}>
            {isOpen ? "▼ AI Insights" : "▲ AI Insights"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setSettingsVisible(true)}
        >
          <Text style={styles.settingsButtonText}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Contents Area */}
      <View style={styles.mainContent}>
        <ScrollView showsVerticalScrollIndicator={true}>
          <View style={styles.contentPadding}>
            {isLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>
                  Analyzing text workspace…
                </Text>
              </View>
            ) : data ? (
              <View style={styles.gap}>
                {data.summary && (
                  <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Context Summary</Text>
                    <Text style={styles.summaryText}>{data.summary}</Text>
                  </View>
                )}

                {data.uncommon_words && data.uncommon_words.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Vocabulary</Text>
                    {data.uncommon_words.map((item, idx) => (
                      <View key={idx} style={styles.wordRow}>
                        <View style={styles.wordHeader}>
                          <Text style={styles.wordText}>{item.word}</Text>
                          <Text style={styles.gradeText}>
                            {item.grade_level}
                          </Text>
                        </View>
                        <Text style={styles.definitionText}>
                          {item.definition}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.centerContainer}>
                <Text style={styles.neutralText}>
                  Highlight text or turn pages to trigger analysis.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 999,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#F1F3F5",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E9ECEF",
    alignItems: "center",
    margin: 0,
    padding: 0,
  },
  sideButtonSpacer: {
    width: 44,
  },
  handleBar: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  handleText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#495057",
  },
  settingsButton: {
    width: 44,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#E9ECEF",
  },
  settingsButtonText: {
    fontSize: 16,
    color: "#007AFF",
  },
  mainContent: {
    flex: 1,
  },
  contentPadding: {
    padding: 16,
  },
  gap: {
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    padding: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#495057",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#343A40",
  },
  wordRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
    paddingVertical: 8,
  },
  wordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  wordText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#212529",
  },
  gradeText: {
    fontSize: 11,
    color: "#868E96",
  },
  definitionText: {
    fontSize: 13,
    color: "#495057",
    marginTop: 2,
  },
  centerContainer: {
    paddingVertical: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#868E96",
  },
  neutralText: {
    fontSize: 13,
    color: "#ADB5BD",
  },
});
