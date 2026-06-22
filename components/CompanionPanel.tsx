import React, { useEffect } from 'react';
import { StyleSheet, View, Text, useWindowDimensions, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface PageInsight {
  summary?: string;
  uncommon_words?: Array<{ word: string; definition: string; grade_level: string }>;
  contextual_insights?: Array<{ subject: string; insight: string }>;
}

interface CompanionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  data: PageInsight | null;
}

const PEEK_HEIGHT = 48; // The permanent visible handle strip height

export default function CompanionPanel({ isOpen, onClose, isLoading, data }: CompanionPanelProps) {
  const { height } = useWindowDimensions();

  const PANEL_HEIGHT = height * 0.55; // Panel covers 55% of the screen when expanded
  const OPEN_Y = 0;
  const CLOSED_Y = PANEL_HEIGHT - PEEK_HEIGHT; // Slides down, leaving just the peek handle visible

  const translateY = useSharedValue(CLOSED_Y);

  useEffect(() => {
    translateY.value = withSpring(isOpen ? OPEN_Y : CLOSED_Y, {
      damping: 24,
      stiffness: 180,
    });
  }, [isOpen, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.panel, { height: PANEL_HEIGHT }, animatedStyle]}>
      {/* Pinned Tab Trigger at the TOP of the bottom panel */}
      <TouchableOpacity 
        style={[styles.handleBar, { height: PEEK_HEIGHT }]} 
        onPress={onClose} 
        activeOpacity={0.9}
      >
        <Text style={styles.handleText}>
          {isOpen ? '▼ AI Insights' : '▲ AI Insights'}
        </Text>
      </TouchableOpacity>

      {/* Scrollable Contents Window Area (offset by the top handle height) */}
      <View style={styles.mainContent}>
        <ScrollView showsVerticalScrollIndicator={true}>
          <View style={styles.contentPadding}>
            {isLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Analyzing text workspace…</Text>
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
                          <Text style={styles.gradeText}>{item.grade_level}</Text>
                        </View>
                        <Text style={styles.definitionText}>{item.definition}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.centerContainer}>
                <Text style={styles.neutralText}>Highlight text or turn pages to trigger analysis.</Text>
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
    position: 'absolute',
    bottom: 0, // Hard anchored to the bottom edge of the device screen context
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 999, // Guarantees layout rendering priority over the reading view port
  },
  handleBar: {
    backgroundColor: '#F1F3F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E9ECEF',
  },
  handleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    padding: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#495057',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#343A40',
  },
  wordRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
    paddingVertical: 8,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  wordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  gradeText: {
    fontSize: 11,
    color: '#868E96',
  },
  definitionText: {
    fontSize: 13,
    color: '#495057',
    marginTop: 2,
  },
  centerContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#868E96',
  },
  neutralText: {
    fontSize: 13,
    color: '#ADB5BD',
  },
});