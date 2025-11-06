import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const pacePresets = [
  {
    id: 'relaxed',
    label: '여유',
    speed: '6.0 km/h',
    description: '대화하며 걸을 수 있는 속도',
  },
  {
    id: 'steady',
    label: '일반',
    speed: '6.5 km/h',
    description: '일상적인 걸음 속도',
  },
  {
    id: 'training',
    label: '운동',
    speed: '7.2 km/h',
    description: '운동 목적의 집중 속도',
  },
];

const weeklyTargets = [
  {
    id: 'distance',
    label: '주간 거리',
    value: '24 km',
    change: '지난주 대비 +3 km',
  },
  {
    id: 'time',
    label: '활동 시간',
    value: '310분',
    change: '지난주 대비 +22분',
  },
  {
    id: 'streak',
    label: '연속 일수',
    value: '11일',
    change: '지난주 대비 +2일',
  },
];

const badgeList = [
  {
    id: 'badge-1',
    title: '9월 걸음 챌린지',
    status: '완료',
    icon: 'emoji-events',
    color: '#7353E5',
  },
  {
    id: 'badge-2',
    title: '주 5회 걸기',
    status: '진행 중',
    icon: 'local-fire-department',
    color: '#FF7043',
  },
  {
    id: 'badge-3',
    title: '도시 탐험가',
    status: '도전 시작',
    icon: 'location-city',
    color: '#2F9BFF',
  },
];

export default function ProfileScreen() {
  const [selectedPace, setSelectedPace] = useState('steady');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [nickname, setNickname] = useState('워커');
  const [goalSteps, setGoalSteps] = useState('8000');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        style={styles.wrapper}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>안녕하세요,</Text>
            <Text style={styles.nickname}>{nickname}님</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <MaterialIcons name="edit" size={18} color="#304FFE" />
            <Text style={styles.editButtonText}>프로필 수정</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.profileCard}>
            <View style={styles.profileFooter}>
              <MaterialIcons name="eco" size={16} color="#27AE60" />
              <Text style={styles.profileFooterText}>
                지난주 대비 활동량이 12% 증가했습니다.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>목표 현황</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>목표 조정</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.goalGrid}>
            {weeklyTargets.map(goal => (
              <View key={goal.id} style={styles.goalCard}>
                <Text style={styles.goalLabel}>{goal.label}</Text>
                <Text style={styles.goalValue}>{goal.value}</Text>
                <Text style={styles.goalChange}>{goal.change}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>걸음 속도</Text>
          <View style={styles.goalGrid}>
            {pacePresets.map(pace => {
              const active = pace.id === selectedPace;
              return (
                <TouchableOpacity
                  key={pace.id}
                  style={[styles.paceCard, active && styles.activePaceCard]}
                  onPress={() => setSelectedPace(pace.id)}
                >
                  <View style={styles.paceHeader}>
                    <MaterialIcons
                      name={active ? 'check-circle' : 'radio-button-unchecked'}
                      size={20}
                      color={active ? '#304FFE' : '#CED4DA'}
                    />
                    <Text
                      style={[
                        styles.paceLabel,
                        active && styles.activePaceLabel,
                      ]}
                    >
                      {pace.label}
                    </Text>
                  </View>
                  <Text
                    style={[styles.paceSpeed, active && styles.activePaceSpeed]}
                  >
                    {pace.speed}
                  </Text>
                  <Text style={styles.paceDescription}>{pace.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>일일 리마인더</Text>
              <Text style={styles.settingDescription}>
                목표 걸음 수를 달성하지 못하면 오후 6시에 알려드립니다.
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              thumbColor={notificationsEnabled ? '#304FFE' : '#FFFFFF'}
              trackColor={{ false: '#E5E7EB', true: '#B9C3FF' }}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>주간 보고서</Text>
              <Text style={styles.settingDescription}>
                매주 월요일 아침에 이메일 요약을 받아보세요.
              </Text>
            </View>
            <Switch
              value={true}
              disabled
              thumbColor="#304FFE"
              trackColor={{ false: '#E5E7EB', true: '#B9C3FF' }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>프로필 설정</Text>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>닉네임</Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              style={styles.formInput}
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>일일 목표 걸음 수</Text>
            <TextInput
              value={goalSteps}
              onChangeText={setGoalSteps}
              keyboardType="numeric"
              style={styles.formInput}
            />
          </View>
          <TouchableOpacity style={styles.saveButton}>
            <Text style={styles.saveButtonText}>변경사항 저장</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>배지</Text>
          <View style={styles.badgeList}>
            {badgeList.map(badge => (
              <View key={badge.id} style={styles.badgeCard}>
                <View
                  style={[
                    styles.badgeIcon,
                    { backgroundColor: `${badge.color}20` },
                  ]}
                >
                  <MaterialIcons
                    name={badge.icon as any}
                    size={20}
                    color={badge.color}
                  />
                </View>
                <View style={styles.badgeInfo}>
                  <Text style={styles.badgeTitle}>{badge.title}</Text>
                  <Text style={styles.badgeStatus}>{badge.status}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={16} color="#ADB5BD" />
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 36 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  wrapper: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: '#667085',
  },
  nickname: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1E21',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#304FFE',
  },
  section: {
    backgroundColor: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1E21',
  },
  sectionLink: {
    fontSize: 14,
    color: '#304FFE',
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: '#F8F9FF',
    borderRadius: 16,
    padding: 16,
  },
  profileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileFooterText: {
    fontSize: 13,
    color: '#667085',
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  goalCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#F8F9FF',
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E8EDF8',
  },
  goalLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  goalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1E21',
  },
  goalChange: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
  paceCard: {
    flex: 1,
    backgroundColor: '#F8F9FF',
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 2,
    borderColor: '#E8EDF8',
    minHeight: 110,
  },
  activePaceCard: {
    borderColor: '#304FFE',
    backgroundColor: 'rgba(48,79,254,0.08)',
  },
  paceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A5568',
  },
  activePaceLabel: {
    color: '#1C1E21',
  },
  paceSpeed: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A5568',
  },
  activePaceSpeed: {
    color: '#304FFE',
  },
  paceDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FF',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginTop: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1E21',
  },
  settingDescription: {
    fontSize: 12,
    color: '#667085',
    marginTop: 4,
    lineHeight: 16,
  },
  formRow: {
    gap: 6,
    marginTop: 12,
  },
  formLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#E0E6F2',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1C1E21',
    backgroundColor: '#F8F9FF',
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: '#304FFE',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  badgeList: {
    gap: 12,
    marginTop: 16,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
    borderRadius: 16,
    padding: 14,
    gap: 14,
  },
  badgeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInfo: {
    flex: 1,
    gap: 4,
  },
  badgeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1E21',
  },
  badgeStatus: {
    fontSize: 12,
    color: '#667085',
  },
});
