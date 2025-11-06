import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import WeatherTestScreen from '../../components/WeatherTestScreen';

export default function WeatherTab() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      <WeatherTestScreen />
    </SafeAreaView>
  );
}
