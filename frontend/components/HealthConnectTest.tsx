import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { 
  readTodayStepsAndDistance, 
  requestHealthConnectPermissions, 
  checkHealthConnectAvailability,
  HealthResult 
} from '../health';

export default function HealthConnectTest() {
  const [healthData, setHealthData] = useState<HealthResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [availability, setAvailability] = useState<boolean | null>(null);

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    const result = await checkHealthConnectAvailability();
    setAvailability(result.available);
    if (!result.available && result.error) {
      Alert.alert('Health Connect Not Available', result.error);
    }
  };

  const requestPermissions = async () => {
    setIsLoading(true);
    try {
      const result = await requestHealthConnectPermissions();
      if (result.success) {
        Alert.alert('Success', 'Health Connect permissions granted!');
      } else {
        Alert.alert('Permission Denied', result.error || 'Failed to get permissions');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const readHealthData = async () => {
    setIsLoading(true);
    try {
      const data = await readTodayStepsAndDistance();
      setHealthData(data);
      
      if (!data.granted) {
        Alert.alert('Permission Required', 'Please grant Health Connect permissions first');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to read health data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Health Connect Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Availability</Text>
        <Text style={styles.status}>
          Health Connect Available: {availability === null ? 'Checking...' : availability ? 'Yes' : 'No'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <Button
          title="Request Permissions"
          onPress={requestPermissions}
          disabled={isLoading || !availability}
        />
        <View style={styles.buttonSpacing} />
        <Button
          title="Read Health Data"
          onPress={readHealthData}
          disabled={isLoading || !availability}
        />
      </View>

      {healthData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Data</Text>
          <Text style={styles.dataText}>Permission Granted: {healthData.granted ? 'Yes' : 'No'}</Text>
          <Text style={styles.dataText}>Steps: {healthData.totalSteps.toLocaleString()}</Text>
          <Text style={styles.dataText}>Distance: {(healthData.totalMeters / 1000).toFixed(2)} km</Text>
          <Text style={styles.dataText}>Source: {healthData.source}</Text>
          <Text style={styles.dataText}>Demo Data: {healthData.isDemoData ? 'Yes' : 'No'}</Text>
          <Text style={styles.dataText}>Timestamp: {new Date(healthData.timestamp).toLocaleString()}</Text>
        </View>
      )}

      {isLoading && (
        <View style={styles.section}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    color: '#666',
  },
  buttonSpacing: {
    height: 10,
  },
  dataText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});