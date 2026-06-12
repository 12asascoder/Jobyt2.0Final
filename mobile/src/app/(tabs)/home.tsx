import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useJobs } from '../../hooks/useJobs';
import { useApplications } from '../../hooks/useApplications';
import { creditService } from '../../services/credit.service';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Coins, MessageSquare, Search, Award, MapPin } from 'lucide-react-native';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { jobs, fetchJobs } = useJobs();
  const { applications, fetchApplications } = useApplications();
  
  const [balance, setBalance] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchApplications(),
        fetchJobs({ limit: 5 }),
      ]);
      const res = await creditService.getBalance();
      setBalance(res.data.balance);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const getAppliedCount = () => applications.length;
  const getInterviewCount = () => applications.filter(a => a.status === 'interview').length;
  const getOfferCount = () => applications.filter(a => a.status === 'offer' || a.status === 'hired').length;

  return (
    <ScrollView
      className="bg-slate-900 flex-1 px-5"
      contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
    >
      {/* Header */}
      <View className="mb-6">
        <Text className="text-slate-400 text-sm font-semibold">WELCOME BACK</Text>
        <Text className="text-white text-3xl font-extrabold tracking-tight mt-1">
          {user?.name || 'User'}
        </Text>
      </View>

      {/* Credit Balance Card */}
      <Card className="bg-indigo-950/40 border-indigo-500/30 mb-6 flex-row items-center justify-between p-6">
        <View>
          <Text className="text-indigo-300 text-sm font-bold tracking-wider uppercase mb-1">Your Balance</Text>
          <Text className="text-white text-3xl font-black">{balance !== null ? `${balance} Credits` : '--'}</Text>
        </View>
        <View className="bg-indigo-600/30 p-3 rounded-2xl">
          <Coins color="#818cf8" size={32} />
        </View>
      </Card>

      {/* Quick Actions */}
      <Text className="text-slate-300 text-lg font-bold mb-4">Quick Tools</Text>
      <View className="flex-row space-x-4 mb-6">
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/career-coach')}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl p-4 items-center justify-center"
        >
          <View className="bg-teal-500/10 p-3 rounded-xl mb-3">
            <MessageSquare color="#14b8a6" size={24} />
          </View>
          <Text className="text-white font-semibold text-center text-xs">AI Career Coach</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/jobs')}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl p-4 items-center justify-center"
        >
          <View className="bg-indigo-500/10 p-3 rounded-xl mb-3">
            <Search color="#6366f1" size={24} />
          </View>
          <Text className="text-white font-semibold text-center text-xs">Explore Jobs</Text>
        </TouchableOpacity>
      </View>

      {/* Career Overview Stats */}
      <Text className="text-slate-300 text-lg font-bold mb-4">Activity Summary</Text>
      <View className="flex-row space-x-3 mb-6">
        <Card className="flex-1 items-center p-4">
          <Text className="text-indigo-400 text-xl font-extrabold">{getAppliedCount()}</Text>
          <Text className="text-slate-400 text-xs mt-1 text-center font-medium">Applied</Text>
        </Card>
        <Card className="flex-1 items-center p-4">
          <Text className="text-emerald-400 text-xl font-extrabold">{getInterviewCount()}</Text>
          <Text className="text-slate-400 text-xs mt-1 text-center font-medium">Interviews</Text>
        </Card>
        <Card className="flex-1 items-center p-4">
          <Text className="text-teal-400 text-xl font-extrabold">{getOfferCount()}</Text>
          <Text className="text-slate-400 text-xs mt-1 text-center font-medium">Offers</Text>
        </Card>
      </View>

      {/* Recommended Jobs */}
      {jobs.length > 0 ? (
        <View className="mb-6">
          <Text className="text-slate-300 text-lg font-bold mb-4">Recommended for You</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-4">
            {jobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: job.id } })}
              >
                <Card className="p-4 w-64 mr-4 bg-slate-800/80 border-slate-700/80 h-36 justify-between">
                  <View>
                    <Text className="text-white font-bold text-sm truncate" numberOfLines={1}>
                      {job.title}
                    </Text>
                    <Text className="text-indigo-400 text-xs mt-0.5 truncate" numberOfLines={1}>
                      {job.company}
                    </Text>
                  </View>
                  <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-slate-700/40">
                    <View className="flex-row items-center">
                      <MapPin color="#94a3b8" size={12} className="mr-1" />
                      <Text className="text-slate-400 text-2xs truncate max-w-[100px]" numberOfLines={1}>
                        {job.location || 'Remote'}
                      </Text>
                    </View>
                    <Badge label="95% Match" variant="success" className="px-1.5 py-0.5" />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Tips / Insights Section */}
      <Card className="bg-slate-800/60 border-slate-700/60 p-5 flex-row items-start">
        <View className="bg-amber-500/10 p-2.5 rounded-xl mr-4">
          <Award color="#f59e0b" size={24} />
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold text-base mb-1">Boost Your Match Score</Text>
          <Text className="text-slate-400 text-sm leading-5">
            Use the AI Career Coach to analyze your resume against job postings and receive an ATS compatibility score.
          </Text>
          <Button
            label="Try Resume Analyzer"
            variant="ghost"
            size="sm"
            onPress={() => router.push('/(tabs)/career-coach')}
            className="self-start mt-2 px-0"
          />
        </View>
      </Card>
    </ScrollView>
  );
}

