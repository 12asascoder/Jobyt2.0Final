import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Bookmark, MapPin, DollarSign, Briefcase } from 'lucide-react-native';
import { Job } from '../../types';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { COLORS } from '../../constants';

interface JobCardProps {
  job: Job;
  onPress: () => void;
  onBookmarkToggle: () => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onPress, onBookmarkToggle }) => {
  return (
    <Card className="mb-4 p-5 bg-slate-800 border-slate-700/80">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-2">
          <Text className="text-white text-lg font-bold truncate" numberOfLines={1}>
            {job.title}
          </Text>
          <Text className="text-slate-400 text-sm font-semibold mt-0.5 truncate" numberOfLines={1}>
            {job.company}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onBookmarkToggle}
          className="p-1 bg-slate-900/50 rounded-lg border border-slate-700"
        >
          <Bookmark
            color={job.is_saved ? COLORS.primary : COLORS.textMuted}
            fill={job.is_saved ? COLORS.primary : 'transparent'}
            size={18}
          />
        </TouchableOpacity>
      </View>

      {/* Meta Infos */}
      <View className="flex-row flex-wrap gap-y-2 gap-x-4 mb-4 mt-2">
        {job.location ? (
          <View className="flex-row items-center">
            <MapPin color={COLORS.textMuted} size={14} className="mr-1.5" />
            <Text className="text-slate-300 text-xs font-medium">{job.location}</Text>
          </View>
        ) : null}

        {job.salary_min !== undefined || job.salary_max !== undefined ? (
          <View className="flex-row items-center">
            <DollarSign color={COLORS.textMuted} size={14} className="mr-1.5" />
            <Text className="text-slate-300 text-xs font-medium">
              {job.salary_min && job.salary_max
                ? `$${(job.salary_min / 1000).toFixed(0)}k - $${(job.salary_max / 1000).toFixed(0)}k`
                : job.salary_min
                ? `$${(job.salary_min / 1000).toFixed(0)}k+`
                : 'Competitive'}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Badges / Bottom bar */}
      <View className="flex-row justify-between items-center pt-3 border-t border-slate-700/40">
        <View className="flex-row gap-x-1.5">
          <Badge label={job.location?.toLowerCase().includes('remote') ? 'Remote' : 'On-Site'} variant="info" />
          {job.skills && job.skills.length > 0 ? (
            <Badge label={job.skills[0]} variant="secondary" />
          ) : null}
        </View>
        
        <TouchableOpacity 
          onPress={onPress}
          className="flex-row items-center"
        >
          <Text className="text-indigo-400 font-bold text-xs mr-1">View Details</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
};
export default JobCard;
