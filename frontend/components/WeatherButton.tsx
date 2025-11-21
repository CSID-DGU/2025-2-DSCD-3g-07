/**
 * 위치 추적 버튼 근처의 간단한 날씨 버튼
 */
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

interface WeatherButtonProps {
  temperature?: number;
  weatherEmoji?: string;
  onPress: () => void;
}

export default function WeatherButton({
  temperature,
  weatherEmoji = '☁️',
  onPress,
}: WeatherButtonProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.emoji}>{weatherEmoji}</Text>
      <Text style={styles.temperature}>
        {temperature !== undefined ? `${Math.round(temperature)}°` : '--°'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'white',
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  emoji: {
    fontSize: 18,
  },
  temperature: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
});
