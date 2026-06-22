import React, { useEffect } from 'react';
import { StyleSheet, View, Text, useWindowDimensions, ScrollView, ActivityIndicator } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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

// How much of the panel stays visible on the right edge when "closed",
// as a hint that it's swipeable.
const PEEK_WIDTH = 24;

export default function CompanionPanel({ isOpen, onClose, isLoading, data }: CompanionPanelProps) {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const PANEL_WIDTH = isTablet ? 380 : width * 0.85;
  const OPEN_X = 0;
  const CLOSED_X = PANEL_WIDTH - PEEK_WIDTH;

  // Start closed (peeking) regardless of screen size.
  const translateX = useSharedValue(CLOSED_X);

  // Drive the slide animation from the isOpen prop, so tapping a word or
  // turning a page (which sets isOpen via App.tsx) actually opens the panel,
  // not just the swipe gesture.
  useEffect(() => {
    translateX.value = withSpring(isOpen ? OPEN_X : CLOSED_X, {
      damping: 18,
      stiffness: 180,
    });
  }, [isOpen, PANEL_WIDTH]);

  const gesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onChange((event) => {
      translateX.value = Math.max(OPEN_X, Math.min(CLOSED_X, translateX.value + event.changeX));
    })
    .onEnd((event) => {
      const shouldClose = event.velocityX > 500 || translateX.value > CLOSED_X / 2;
      translateX.value = withSpring(shouldClose ? CLOSED_X : OPEN_X, {
        damping: 18,
        stiffness: 180,
      });
      // Keep the parent's isOpen state in sync so a later programmatic
      // open/close (e.g. from a new lookup) starts from the right place.
      if (shouldClose) {
        onClose();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.panel, { width: PANEL_WIDTH }, animatedStyle]}>
        {/* Header Branding Panel */}
        <View style={styles.header}>
          <Text style={styles.title}>Page Companion</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Llama 3.1 8B</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Running structural analysis...</Text>
          </View>
        ) : data ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* 1. Narrative Summary Card */}
            {data.summary && (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>Context Summary</Text>
                <Text style={styles.summaryText}>{data.summary}</Text>
              </View>
            )}

            {/* 2. Vocabulary Chips & Definitions */}
            {data.uncommon_words && data.uncommon_words.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>Vocabulary Expansion</Text>
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

            {/* 3. Specialized Deep Lore Insights */}
            {data.contextual_insights && data.contextual_insights.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>Contextual Insights</Text>
                {data.contextual_insights.map((item, idx) => (
                  <View key={idx} style={styles.insightBox}>
                    <Text style={styles.insightSubject}>{item.subject}</Text>
                    <Text style={styles.insightText}>{item.insight}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.centerContainer}>
            <Text style={styles.neutralText}>Turn the page or highlight specific text to update the companion.</Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 1,
    borderLeftColor: '#E9ECEF',
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212529',
    letterSpacing: -0.2,
  },
  badge: {
    backgroundColor: '#E7F5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    color: '#228BE6',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#868E96',
  },
  neutralText: {
    fontSize: 13,
    color: '#ADB5BD',
    textAlign: 'center',
    lineHeight: 18,
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
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#343A40',
  },
  wordRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
    paddingVertical: 10,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  wordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  gradeText: {
    fontSize: 11,
    color: '#868E96',
    fontStyle: 'italic',
  },
  definitionText: {
    fontSize: 13,
    color: '#495057',
    lineHeight: 17,
  },
  insightBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#339AF0',
  },
  insightSubject: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C7ED6',
    marginBottom: 3,
  },
  insightText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#495057',
  },
});