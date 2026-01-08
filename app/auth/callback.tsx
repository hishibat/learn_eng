import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/Themed';
import { useAuth } from '@/lib/AuthContext';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (session) {
        router.replace('/');
      } else {
        router.replace('/login');
      }
    }
  }, [session, loading, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#4285F4" />
      <Text style={styles.text}>ログイン中...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
