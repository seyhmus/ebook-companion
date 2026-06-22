import React, { useEffect } from 'react';
import { StyleSheet, View, Text, useWindowDimensions, ScrollView, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { TocItem } from './EpubViewer';

interface TocPanelProps {
  isOpen: boolean;
  onClose: () => void;
  toc: TocItem[];
  onSelect: (href: string) => void;
}

// How much of the panel stays visible on the left edge when "closed", as a
// hint that it's swipeable. Mirrors CompanionPanel's PEEK_WIDTH.
const PEEK_WIDTH = 24;

export default function TocPanel({ isOpen, onClose, toc, onSelect }: TocPanelProps) {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  const PANEL_WIDTH = isTablet ? 380 : width * 0.85;
  const OPEN_X = 0;
  // Panel is anchored to the left, so "closed" means shifted left by its
  // own width minus the peek amount (negative translateX).
  const CLOSED_X = -(PANEL_WIDTH - PEEK_WIDTH);

  const translateX = useSharedValue(CLOSED_X);

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
      translateX.value = Math.max(CLOSED_X, Math.min(OPEN_X, translateX.value + event.changeX));
    })
    .onEnd((event) => {
      const shouldClose = event.velocityX < -500 || translateX.value < CLOSED_X / 2;
      translateX.value = withSpring(shouldClose ? CLOSED_X : OPEN_X, {
        damping: 18,
        stiffness: 180,
      });
      if (shouldClose) {
        onClose();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleSelect = (href: string) => {
    onSelect(href);
    onClose();
  };

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.panel, { width: PANEL_WIDTH }, animatedStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>Contents</Text>
        </View>

        {toc.length > 0 ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {toc.map((item, idx) => (
              <TouchableOpacity
                key={`${item.href}-${idx}`}
                style={[styles.tocRow, { paddingLeft: 16 + item.depth * 16 }]}
                onPress={() => handleSelect(item.href)}
              >
                <Text style={styles.tocLabel} numberOfLines={2}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.centerContainer}>
            <Text style={styles.neutralText}>Table of contents will appear here once the book loads.</Text>
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
    left: 0,
    backgroundColor: '#F8F9FA',
    borderRightWidth: 1,
    borderRightColor: '#E9ECEF',
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
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
  scrollContent: {
    paddingVertical: 8,
  },
  tocRow: {
    paddingVertical: 12,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  tocLabel: {
    fontSize: 13,
    color: '#343A40',
    lineHeight: 18,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  neutralText: {
    fontSize: 13,
    color: '#ADB5BD',
    textAlign: 'center',
    lineHeight: 18,
  },
});