import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Markdown from 'react-native-markdown-display';
import { careerCoachService } from '../../services/career-coach.service';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { FileText, ChevronLeft, Brain, Cpu, CheckCircle, AlertTriangle, ArrowRight, TrendingUp, TrendingDown, Minus, Calendar, Clock, Trophy } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useInterviewStore } from '../../store/interview.store';
import { formatDate } from '../../lib/utils';

type SubScreen = 'home' | 'ats_analyzer' | 'skill_gap' | 'mock_interview';

export default function CareerCoachScreen() {
  const [activeScreen, setActiveScreen] = useState<SubScreen>('home');
  const [resumes, setResumes] = useState<any[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [selectedResumeName, setSelectedResumeName] = useState<string>('');
  const [jobDescription, setJobDescription] = useState('');
  
  // Skill Gap inputs
  const [userSkillsInput, setUserSkillsInput] = useState('');
  const [requiredSkillsInput, setRequiredSkillsInput] = useState('');

  // Results
  const [atsResult, setAtsResult] = useState<any>(null);
  const [skillGapResult, setSkillGapResult] = useState<any>(null);
  
  // Loading states
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const router = useRouter();
  const { isOffline } = useNetworkStatus();
  const { 
    sessions, 
    readinessScore, 
    readinessHistory, 
    loading: loadingInterview, 
    fetchSessions, 
    fetchReadiness 
  } = useInterviewStore();

  useEffect(() => {
    fetchResumes();
  }, []);

  useEffect(() => {
    if (activeScreen === 'mock_interview') {
      fetchSessions();
      fetchReadiness();
    }
  }, [activeScreen]);

  const fetchResumes = async () => {
    setLoadingResumes(true);
    try {
      const res = await careerCoachService.getMyResumes();
      setResumes(res.data.resumes || []);
      if (res.data.resumes && res.data.resumes.length > 0) {
        setSelectedResumeId(res.data.resumes[0].id);
        setSelectedResumeName(res.data.resumes[0].filename);
      }
    } catch (err) {
      console.error('Failed to fetch user resumes', err);
    } finally {
      setLoadingResumes(false);
    }
  };

  const handleUploadResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      });

      if (result.canceled) return;

      setUploading(true);
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('resume', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);

      await careerCoachService.uploadAndParseResume(formData);
      Alert.alert('Success', 'Temporary resume uploaded and parsed successfully.');
      
      await fetchResumes();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to upload resume';
      Alert.alert('Upload Failed', msg);
    } finally {
      setUploading(false);
    }
  };

  const handleATSAnalysis = async () => {
    if (!jobDescription.trim()) {
      Alert.alert('Validation Error', 'Please enter the job description.');
      return;
    }
    if (!selectedResumeId) {
      Alert.alert('Validation Error', 'Please select or upload a resume.');
      return;
    }

    setProcessing(true);
    try {
      const res = await careerCoachService.scoreATS({
        resume_id: selectedResumeId,
        jobDescription,
      });
      setAtsResult(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'ATS Analysis failed';
      Alert.alert('Analysis Error', msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleSkillGapAnalysis = async () => {
    if (!userSkillsInput.trim() || !requiredSkillsInput.trim()) {
      Alert.alert('Validation Error', 'Please enter both your skills and the required skills.');
      return;
    }

    setProcessing(true);
    try {
      const userSkills = userSkillsInput.split(',').map(s => s.trim()).filter(Boolean);
      const requiredSkills = requiredSkillsInput.split(',').map(s => s.trim()).filter(Boolean);
      
      const res = await careerCoachService.getSkillGap(userSkills, requiredSkills);
      setSkillGapResult(res.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Skill gap analysis failed';
      Alert.alert('Analysis Error', msg);
    } finally {
      setProcessing(false);
    }
  };

  const renderHeader = (title: string) => (
    <View className="flex-row items-center mb-6 mt-2">
      <TouchableOpacity 
        onPress={() => {
          setActiveScreen('home');
          setAtsResult(null);
          setSkillGapResult(null);
        }}
        className="mr-4 bg-slate-50 p-2.5 rounded-full border border-slate-200"
      >
        <ChevronLeft color="#0b1120" size={20} />
      </TouchableOpacity>
      <Text className="text-slate-900 text-2xl font-black">{title}</Text>
    </View>
  );

  if (activeScreen === 'mock_interview') {
    return (
      <ScrollView className="bg-[#fcfcfc] flex-1 px-5" contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}>
        {renderHeader('AI Mock Interview')}

        {isOffline && (
          <View className="mb-4 bg-amber-50 border border-amber-200 p-4 rounded-xl flex-row items-center">
            <AlertTriangle color="#d97706" size={20} className="mr-2" />
            <Text className="text-amber-800 text-xs flex-1 font-semibold">
              You are currently offline. Displaying cached readiness metrics and interview sessions.
            </Text>
          </View>
        )}

        {/* Readiness Rating Card (styled as a sleek dark card to pop like on web dashboard) */}
        <View className="mb-6 p-5 bg-[#141414] border border-white/5 rounded-2xl shadow-xl flex-row justify-between items-center">
          <View>
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">Interview Readiness</Text>
            <Text className="text-[#c3ff3d] text-3xl font-black mt-1">
              {readinessScore?.current_score !== undefined && readinessScore?.current_score !== null
                ? `${readinessScore.current_score}/100`
                : 'N/A'}
            </Text>
          </View>
          {readinessScore?.trend && (
            <View>
              {readinessScore.trend === 'improving' ? (
                <Badge label="Improving" variant="success" />
              ) : readinessScore.trend === 'declining' ? (
                <Badge label="Declining" variant="danger" />
              ) : (
                <Badge label="Stable" variant="secondary" />
              )}
            </View>
          )}
        </View>

        {/* Score Progression History */}
        <Card className="mb-6 p-5 rounded-3xl shadow-sm border border-slate-200">
          <Text className="text-slate-900 font-extrabold text-base mb-3">Score Progress History</Text>
          {readinessHistory && readinessHistory.length > 0 ? (
            <View className="space-y-3">
              {readinessHistory.map((item, idx) => (
                <View key={item.id || idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex-row justify-between items-center">
                  <View className="flex-1 mr-2">
                    <Text className="text-slate-800 font-bold text-xs">
                      {item.previous_score !== null 
                        ? `Score updated to ${item.new_score} (was ${item.previous_score})`
                        : `First assessment: ${item.new_score}`}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <Calendar color="#64748b" size={10} className="mr-1" />
                      <Text className="text-slate-500 text-[10px] font-semibold">{formatDate(item.created_at)}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    {item.trend === 'improving' ? (
                      <TrendingUp color="#10b981" size={14} className="mr-1" />
                    ) : item.trend === 'declining' ? (
                      <TrendingDown color="#ef4444" size={14} className="mr-1" />
                    ) : (
                      <Minus color="#94a3b8" size={14} className="mr-1" />
                    )}
                    <Text className={`text-[10px] font-extrabold ml-1 ${
                      item.trend === 'improving' ? 'text-emerald-600' : item.trend === 'declining' ? 'text-rose-600' : 'text-slate-500'
                    }`}>
                      {item.trend.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-slate-500 text-xs italic font-medium">
              No score progression history found. Complete an interview session to compute your readiness rating.
            </Text>
          )}
        </Card>

        {/* CTA: Start New Mock Interview */}
        <Button
          label={isOffline ? 'Start Mock Interview (Online Only)' : 'Start Mock Interview'}
          variant="primary"
          size="lg"
          className="mb-6"
          disabled={isOffline}
          onPress={() => router.push('/interviews/create')}
        />

        {/* Previous Session History */}
        <Text className="text-slate-900 font-extrabold text-base mb-3">Previous Sessions</Text>
        {loadingInterview && sessions.length === 0 ? (
          <ActivityIndicator color="#0b1120" size="small" className="my-4" />
        ) : sessions.length > 0 ? (
          <View className="space-y-3">
            {sessions.map((session) => {
              const isCompleted = ['completed', 'evaluated', 'report_generated'].includes(session.status);
              return (
                <TouchableOpacity
                  key={session.id}
                  className="bg-white border border-slate-200 p-4 rounded-3xl flex-row justify-between items-center shadow-sm"
                  onPress={() => {
                    if (isCompleted) {
                      router.push(`/interviews/${session.id}/report` as any);
                    } else {
                      if (isOffline) {
                        Alert.alert('Offline', 'Cannot resume interview while offline.');
                      } else {
                        router.push(`/interviews/${session.id}/question` as any);
                      }
                    }
                  }}
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-slate-900 font-extrabold text-sm" numberOfLines={1}>{session.role_title}</Text>
                    <View className="flex-row items-center mt-1 space-x-3">
                      <View className="flex-row items-center">
                        <Calendar color="#64748b" size={10} className="mr-1" />
                        <Text className="text-slate-500 text-[10px] font-semibold">{formatDate(session.created_at)}</Text>
                      </View>
                      <View className="flex-row items-center">
                        <Clock color="#64748b" size={10} className="mr-1" />
                        <Text className="text-slate-500 text-[10px] font-semibold">{session.question_count} Questions</Text>
                      </View>
                    </View>
                  </View>
                  <View className="items-end">
                    {isCompleted ? (
                      <View className="items-end">
                        <Text className="text-slate-900 font-extrabold text-sm mb-1">
                          {session.overall_score !== null ? `${session.overall_score}%` : 'N/A'}
                        </Text>
                        <Badge label="Report" variant="success" />
                      </View>
                    ) : (
                      <Badge label="Resume" variant="warning" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Card className="p-4 items-center rounded-3xl border border-slate-200">
            <Trophy color="#64748b" size={24} className="mb-2" />
            <Text className="text-slate-500 text-xs italic text-center font-semibold">
              You haven't completed any mock interviews yet.
            </Text>
          </Card>
        )}
      </ScrollView>
    );
  }

  if (activeScreen === 'home') {
    return (
      <ScrollView className="bg-[#fcfcfc] flex-1 px-5" contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}>
        <View className="items-center my-6">
          <View className="bg-blue-50 p-4 rounded-full border border-blue-100 mb-3 shadow-sm">
            <Brain color="#2563eb" size={40} />
          </View>
          <Text className="text-slate-900 text-2xl font-black">AI Career Coach</Text>
          <Text className="text-slate-500 text-sm mt-1.5 text-center px-4 font-semibold">
            Leverage advanced AI orchestration to optimize your career path and resume matching.
          </Text>
        </View>

        {/* Feature Buttons */}
        <View className="space-y-4">
          <TouchableOpacity 
            onPress={() => setActiveScreen('ats_analyzer')}
            className="bg-white border border-slate-200 p-5 flex-row items-center justify-between shadow-sm rounded-3xl"
          >
            <View className="flex-row items-center flex-1 mr-4">
              <View className="bg-blue-50 border border-blue-100 p-3 rounded-xl mr-4 shadow-sm">
                <Cpu color="#2563eb" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 font-extrabold text-base mb-1">Resume ATS Matcher</Text>
                <Text className="text-slate-500 text-xs leading-4 font-semibold">
                  Compare your resume against any job description to evaluate ATS compatibility.
                </Text>
              </View>
            </View>
            <ArrowRight color="#0b1120" size={16} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setActiveScreen('skill_gap')}
            className="bg-white border border-slate-200 p-5 flex-row items-center justify-between shadow-sm rounded-3xl"
          >
            <View className="flex-row items-center flex-1 mr-4">
              <View className="bg-teal-50 border border-teal-100 p-3 rounded-xl mr-4 shadow-sm">
                <Brain color="#14b8a6" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 font-extrabold text-base mb-1">Skill Gap Finder</Text>
                <Text className="text-slate-500 text-xs leading-4 font-semibold">
                  Identify key skill deficiencies against your target role with learning pathways.
                </Text>
              </View>
            </View>
            <ArrowRight color="#0b1120" size={16} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setActiveScreen('mock_interview')}
            className="bg-white border border-slate-200 p-5 flex-row items-center justify-between shadow-sm rounded-3xl"
          >
            <View className="flex-row items-center flex-1 mr-4">
              <View className="bg-amber-50 border border-amber-100 p-3 rounded-xl mr-4 shadow-sm">
                <Brain color="#d97706" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-slate-900 font-extrabold text-base mb-1">AI Mock Interview</Text>
                <Text className="text-slate-500 text-xs leading-4 font-semibold">
                  Practice roles, receive question-by-question scoring and complete readiness assessments.
                </Text>
              </View>
            </View>
            <ArrowRight color="#0b1120" size={16} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (activeScreen === 'ats_analyzer') {
    return (
      <ScrollView className="bg-[#fcfcfc] flex-1 px-5" contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}>
        {renderHeader('ATS Resume Matcher')}

        {!atsResult ? (
          <View className="space-y-5">
            {/* Resume Selection Card */}
            <Card className="p-5 border border-slate-200 rounded-3xl shadow-sm">
              <Text className="text-slate-900 font-bold text-base mb-3">1. Select Resume</Text>
              
              {loadingResumes ? (
                <ActivityIndicator color="#0b1120" size="small" />
              ) : resumes.length > 0 ? (
                <View className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center flex-1 mr-4">
                    <FileText color="#2563eb" size={20} className="mr-3" />
                    <Text className="text-slate-800 font-semibold text-sm truncate" numberOfLines={1}>
                      {selectedResumeName || 'Default Resume'}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text className="text-slate-500 text-sm mb-4 font-medium">No resumes found. Please upload a resume below.</Text>
              )}

              <Button
                label={uploading ? 'Uploading...' : 'Upload New Resume (PDF/DOCX)'}
                variant="outline"
                size="md"
                disabled={uploading}
                onPress={handleUploadResume}
              />
            </Card>

            {/* Job Description Card */}
            <Card className="p-5 border border-slate-200 rounded-3xl shadow-sm">
              <Text className="text-slate-900 font-bold text-base mb-3">2. Job Description</Text>
              <TextInput
                multiline
                numberOfLines={8}
                placeholder="Paste the target job description or requirements here..."
                placeholderTextColor="#94a3b8"
                value={jobDescription}
                onChangeText={setJobDescription}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm h-40 focus:border-slate-800"
                style={{ textAlignVertical: 'top' }}
              />
            </Card>

            <Button
              label="Run ATS Analysis"
              variant="primary"
              size="lg"
              loading={processing}
              onPress={handleATSAnalysis}
            />
          </View>
        ) : (
          <View className="space-y-5">
            {/* ATS Score Card */}
            <View className="items-center p-6 bg-[#141414] border border-white/5 rounded-2xl shadow-xl">
              <Text className="text-slate-400 text-sm font-bold tracking-wider uppercase mb-2">ATS Compatibility Score</Text>
              <Text className="text-[#c3ff3d] text-5xl font-black mb-3">{atsResult.score ?? atsResult.matchScore ?? atsResult.atsScore ?? '85'}%</Text>
              <Badge 
                label={(atsResult.score ?? 85) >= 80 ? 'High Match' : 'Gap Identified'} 
                variant={(atsResult.score ?? 85) >= 80 ? 'success' : 'warning'} 
              />
            </View>

            {/* Detailed Feedback */}
            <Card className="p-5 border border-slate-200 rounded-3xl shadow-sm">
              <Text className="text-slate-900 font-extrabold text-lg mb-3">Analysis Breakdown</Text>
              <View>
                <Markdown style={{
                  body: { color: '#334155', fontSize: 14, lineHeight: 20 },
                  heading2: { color: '#0b1120', fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
                  strong: { color: '#2563eb', fontWeight: 'bold' },
                  bullet_list: { marginTop: 4 },
                }}>
                  {(() => {
                    const raw = atsResult.feedback || atsResult.analysis || atsResult.recommendations;
                    if (!raw) return 'ATS feedback rendering here...';
                    if (typeof raw === 'string') return raw;
                    return JSON.stringify(raw, null, 2);
                  })()}
                </Markdown>
              </View>
            </Card>

            <Button
              label="Analyze Another Job"
              variant="outline"
              size="lg"
              onPress={() => setAtsResult(null)}
            />
          </View>
        )}
      </ScrollView>
    );
  }

  // Skill Gap Screen
  return (
    <ScrollView className="bg-[#fcfcfc] flex-1 px-5" contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}>
      {renderHeader('Skill Gap Finder')}

      {!skillGapResult ? (
        <View className="space-y-5">
          <Card className="p-5 border border-slate-200 rounded-3xl shadow-sm">
            <Text className="text-slate-900 font-bold text-base mb-3">Your Current Skills</Text>
            <Input
              placeholder="e.g. React, JavaScript, Node.js, Git"
              value={userSkillsInput}
              onChangeText={setUserSkillsInput}
            />
            <Text className="text-slate-500 text-xs font-semibold">Separate skills with commas.</Text>
          </Card>

          <Card className="p-5 border border-slate-200 rounded-3xl shadow-sm">
            <Text className="text-slate-900 font-bold text-base mb-3">Required Job Skills</Text>
            <Input
              placeholder="e.g. React Native, TypeScript, GraphQL, AWS"
              value={requiredSkillsInput}
              onChangeText={requiredSkillsInput => setRequiredSkillsInput(requiredSkillsInput)}
            />
            <Text className="text-slate-500 text-xs font-semibold">Separate skills with commas.</Text>
          </Card>

          <Button
            label="Find Skill Gaps"
            variant="primary"
            size="lg"
            loading={processing}
            onPress={handleSkillGapAnalysis}
          />
        </View>
      ) : (
        <View className="space-y-5">
          {/* Stats / Gaps summary */}
          <Card className="p-5 border border-slate-200 rounded-3xl shadow-sm">
            <Text className="text-slate-900 font-extrabold text-lg mb-4">Skills Matching Summary</Text>
            
            <View className="flex-row space-x-3 mb-2">
              <View className="flex-1 bg-emerald-50 border border-emerald-100 p-4 rounded-xl items-center">
                <CheckCircle color="#10b981" size={24} className="mb-2" />
                <Text className="text-emerald-800 font-extrabold text-sm">Matching</Text>
                <Text className="text-emerald-700 text-xl font-extrabold mt-1">
                  {skillGapResult.matchingSkills?.length ?? 0}
                </Text>
              </View>

              <View className="flex-1 bg-red-50 border border-red-100 p-4 rounded-xl items-center">
                <AlertTriangle color="#ef4444" size={24} className="mb-2" />
                <Text className="text-red-800 font-extrabold text-sm">Missing</Text>
                <Text className="text-red-700 text-xl font-extrabold mt-1">
                  {skillGapResult.missingSkills?.length ?? 0}
                </Text>
              </View>
            </View>
          </Card>

          {/* Detailed Gaps & Pathways */}
          <Card className="p-5 border border-slate-200 rounded-3xl shadow-sm">
            <Text className="text-slate-900 font-extrabold text-lg mb-3">Gap Mitigation Pathway</Text>
            <Markdown style={{
              body: { color: '#334155', fontSize: 14, lineHeight: 20 },
              heading2: { color: '#0b1120', fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
              strong: { color: '#14b8a6', fontWeight: 'bold' },
              bullet_list: { marginTop: 4 },
            }}>
              {(() => {
                const raw = skillGapResult.recommendations || skillGapResult.pathway;
                if (!raw) return 'Learning pathway recommendations rendering here...';
                if (typeof raw === 'string') return raw;
                return JSON.stringify(raw, null, 2);
              })()}
            </Markdown>
          </Card>

          <Button
            label="Run Another Gap Analysis"
            variant="outline"
            size="lg"
            onPress={() => setSkillGapResult(null)}
          />
        </View>
      )}
    </ScrollView>
  );
}
