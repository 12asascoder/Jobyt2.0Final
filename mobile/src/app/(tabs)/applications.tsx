import React, { useEffect, useState } from 'react';
import { View, Text, RefreshControl, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useApplications } from '../../hooks/useApplications';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { formatDate } from '../../lib/utils';
import { Briefcase, Calendar, ChevronRight } from 'lucide-react-native';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Applied', value: 'applied' },
  { label: 'Review', value: 'in_review' },
  { label: 'Shortlist', value: 'shortlisted' },
  { label: 'Interview', value: 'interview' },
  { label: 'Offer', value: 'offer' },
  { label: 'Rejected', value: 'rejected' },
];

export default function ApplicationsTabScreen() {
  const router = useRouter();
  const { applications, loading, fetchApplications, stats, fetchStats } = useApplications();
  const [activeStatus, setActiveStatus] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchApplications(), fetchStats()]);
    setRefreshing(false);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'applied':
        return 'primary';
      case 'in_review':
        return 'info';
      case 'shortlisted':
      case 'interview':
        return 'warning';
      case 'offer':
      case 'hired':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const filteredApplications = activeStatus
    ? applications.filter((app) => app.status === activeStatus)
    : applications;

  return (
    <View className="flex-1 bg-slate-900">
      {/* Stats Cards Section */}
      <View className="px-5 pt-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-3 mb-4">
          <Card className="items-center p-4 min-w-[100px] border-slate-700/50">
            <Text className="text-white text-xs font-semibold">Total</Text>
            <Text className="text-indigo-400 text-xl font-black mt-1">{applications.length}</Text>
          </Card>
          <Card className="items-center p-4 min-w-[100px] border-slate-700/50">
            <Text className="text-white text-xs font-semibold">Active</Text>
            <Text className="text-emerald-400 text-xl font-black mt-1">
              {applications.filter((a) => a.status !== 'rejected' && a.status !== 'hired').length}
            </Text>
          </Card>
          <Card className="items-center p-4 min-w-[100px] border-slate-700/50">
            <Text className="text-white text-xs font-semibold">Offers</Text>
            <Text className="text-teal-400 text-xl font-black mt-1">
              {applications.filter((a) => a.status === 'offer' || a.status === 'hired').length}
            </Text>
          </Card>
        </ScrollView>
      </View>

      {/* Horizontal Filter Tabs */}
      <View className="border-b border-slate-800 pb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          className="flex-row space-x-2"
        >
          {STATUS_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.label}
              onPress={() => setActiveStatus(filter.value)}
              className={`px-4 py-2 rounded-full border ${
                activeStatus === filter.value
                  ? 'bg-indigo-600/20 border-indigo-500'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <Text className={activeStatus === filter.value ? 'text-indigo-300 text-xs font-semibold' : 'text-slate-400 text-xs font-semibold'}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Applications List */}
      <View className="flex-1 px-5 pt-4">
        <FlatList
          data={filteredApplications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/applications/[id]', params: { id: item.id } })}
              activeOpacity={0.7}
            >
              <Card className="mb-4 p-4 flex-row justify-between items-center border-slate-700/60 bg-slate-800/80">
                <View className="flex-1 mr-4">
                  <Text className="text-white text-base font-bold truncate" numberOfLines={1}>
                    {item.job?.title || 'Unknown Job'}
                  </Text>
                  <Text className="text-slate-400 text-xs mt-1 font-semibold truncate" numberOfLines={1}>
                    {item.job?.company || 'Unknown Company'}
                  </Text>
                  <View className="flex-row items-center mt-2">
                    <Calendar color="#64748b" size={12} className="mr-1" />
                    <Text className="text-slate-500 text-2xs font-medium">
                      Applied: {formatDate(item.created_at)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <Badge
                    label={(item.status || 'applied').replace('_', ' ').toUpperCase()}
                    variant={getStatusVariant(item.status || 'applied')}
                    className="mr-2"
                  />
                  <ChevronRight color="#64748b" size={16} />
                </View>
              </Card>
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366f1" />
          }
          ListEmptyComponent={
            !loading ? (
              <View className="items-center justify-center py-20">
                <Text className="text-slate-400 text-sm">No applications found.</Text>
              </View>
            ) : null
          }
        />
      </View>
    </View>
  );
}
