import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useAuth } from '@/lib/AuthContext';
import { useStudy } from '@/hooks/useStudy';
import { StudyStats } from '@/types/database';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { getStudyStats } = useStudy();
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadStats = async () => {
    setLoading(true);
    const studyStats = await getStudyStats();
    setStats(studyStats);
    setLoading(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/');
          },
        },
      ]
    );
  };

  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="user-circle" size={64} color="#9ca3af" />
        <Text style={styles.emptyText}>ログインしてください</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginButtonText}>ログイン</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* プロフィールヘッダー */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <FontAwesome name="user-circle" size={80} color="#6366f1" />
        </View>
        <Text style={styles.userName}>
          {user.user_metadata?.full_name || user.email}
        </Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      {/* 統計 */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>学習統計</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.totalWords || 0}</Text>
            <Text style={styles.statLabel}>総単語数</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.masteredWords || 0}</Text>
            <Text style={styles.statLabel}>習得済み</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.learningWords || 0}</Text>
            <Text style={styles.statLabel}>学習中</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.newWords || 0}</Text>
            <Text style={styles.statLabel}>新規</Text>
          </View>
        </View>
      </View>

      {/* 進捗バー */}
      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>習得進捗</Text>
        <View style={styles.progressCard}>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${
                    stats?.totalWords
                      ? (stats.masteredWords / stats.totalWords) * 100
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {stats?.totalWords
              ? Math.round((stats.masteredWords / stats.totalWords) * 100)
              : 0}
            % 習得
          </Text>
        </View>
      </View>

      {/* アクション */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => router.push('/statistics')}
        >
          <FontAwesome name="bar-chart" size={20} color="#6366f1" />
          <Text style={[styles.actionText, { color: '#6366f1' }]}>
            詳細統計を見る
          </Text>
          <FontAwesome name="chevron-right" size={16} color="#9ca3af" style={styles.actionChevron} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={handleSignOut}>
          <FontAwesome name="sign-out" size={20} color="#ef4444" />
          <Text style={[styles.actionText, { color: '#ef4444' }]}>
            ログアウト
          </Text>
        </TouchableOpacity>
      </View>

      {/* バージョン情報 */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Version 1.0.0 (MVP)</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  progressSection: {
    padding: 20,
    paddingTop: 0,
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'right',
  },
  actionsSection: {
    padding: 20,
    paddingTop: 0,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  actionChevron: {
    marginLeft: 'auto',
  },
  versionContainer: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  versionText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
