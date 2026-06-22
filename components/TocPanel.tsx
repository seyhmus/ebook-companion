import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface TocItem {
  label: string;
  href: string;
  depth: number;
}

interface TocPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  toc: TocItem[];
  onSelect: (href: string) => void;
}

const PEEK_HEIGHT = 48; // Height of the handle bar strip

export default function TocPanel({ isOpen, onToggle, toc, onSelect }: TocPanelProps) {
  const { height } = useWindowDimensions();
  
  // Limit the expanded TOC to 45% of the screen height instead of full screen
  const MAX_EXPANDED_HEIGHT = height * 0.45; 
  
  const translateY = useSharedValue(-MAX_EXPANDED_HEIGHT + PEEK_HEIGHT);

  useEffect(() => {
    // When open, slide down to 0. When closed, hide everything except the peek strip.
    const targetY = isOpen ? 0 : -MAX_EXPANDED_HEIGHT + PEEK_HEIGHT;
    translateY.value = withSpring(targetY, {
      damping: 24,
      stiffness: 180,
    });
  }, [isOpen, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.panel, { height: MAX_EXPANDED_HEIGHT }, animatedStyle]}>
      {/* Scrollable List Area (hidden off-screen at the top when closed) */}
      <View style={styles.mainContent}>
        <ScrollView showsVerticalScrollIndicator={true}>
          <View style={styles.listPadding}>
            {toc.length === 0 ? (
              <Text style={styles.emptyText}>No table of contents found.</Text>
            ) : (
              toc.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.tocRow, { paddingLeft: 16 + item.depth * 12 }]}
                  onPress={() => onSelect(item.href)}
                >
                  <Text style={styles.tocText} numberOfLines={1}>
                    {item.label.trim()}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      {/* Handle Bar Trigger pinned strictly to the bottom of this panel component */}
      <TouchableOpacity 
        style={[styles.handleBar, { height: PEEK_HEIGHT }]} 
        onPress={onToggle} 
        activeOpacity={0.9}
      >
        <Text style={styles.handleText}>
          {isOpen ? '▲ Table of Contents' : '▼ Table of Contents'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 999,
  },
  mainContent: {
    flex: 1,
  },
  listPadding: {
    paddingVertical: 8,
  },
  tocRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
  },
  tocText: {
    fontSize: 14,
    color: '#495057',
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: '#ADB5BD',
    fontSize: 14,
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
});