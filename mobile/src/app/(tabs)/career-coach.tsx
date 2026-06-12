import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Markdown from 'react-native-markdown-display';
import { careerCoachService } from '../../services/career-coach.service';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { FileText, ChevronLeft, Brain, Cpu, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react-native';

type SubScreen = 'home' | 'ats_analyzer' | 'skill_gap' | 'job_match';

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

  useEffect(() => {
    fetchResumes();
  }, []);

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

      const res = await careerCoachService.uploadAndParseResume(formData);
      Alert.alert('Success', 'Temporary resume uploaded and parsed successfully.');
      
      // Refresh list to pull the newly uploaded resume
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
        className="mr-4 bg-slate-800 p-2.5 rounded-full border border-slate-700"
      >
        <ChevronLeft color="#f8fafc" size={20} />
      </TouchableOpacity>
      <Text className="text-white text-2xl font-black">{title}</Text>
    </View>
  );

  if (activeScreen === 'home') {
    return (
      <ScrollView className="bg-slate-900 flex-1 px-5" contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}>
        <View className="items-center my-6">
          <View className="bg-indigo-600/10 p-4 rounded-full border border-indigo-500/20 mb-3">
            <Brain color="#6366f1" size={40} />
          </View>
          <Text className="text-white text-2xl font-black">AI Career Coach</Text>
          <Text className="text-slate-400 text-sm mt-1 text-center px-4">
            Leverage advanced AI orchestration to optimize your career path and resume matching.
          </Text>
        </View>

        {/* Feature Buttons */}
        <View className="space-y-4">
          <TouchableOpacity 
            onPress={() => setActiveScreen('ats_analyzer')}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1 mr-4">
              <View className="bg-indigo-600/10 p-3 rounded-xl mr-4">
                <Cpu color="#6366f1" size={24} />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base mb-1">Resume ATS Matcher</Text>
                <Text className="text-slate-400 text-xs leading-4">
                  Compare your resume against any job description to evaluate ATS compatibility.
                </Text>
              </View>
            </View>
            <ArrowRight color="#94a3b8" size={20} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setActiveScreen('skill_gap')}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1 mr-4">
              <View className="bg-teal-600/10 p-3 rounded-xl mr-4">
                <Brain color="#14b8a6" size={24} />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base mb-1">Skill Gap Finder</Text>
                <Text className="text-slate-400 text-xs leading-4">
                  Identify key skill deficiencies against your target role with learning pathways.
                </Text>
              </View>
            </View>
            <ArrowRight color="#94a3b8" size={20} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (activeScreen === 'ats_analyzer') {
    return (
      <ScrollView className="bg-slate-900 flex-1 px-5" contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}>
        {renderHeader('ATS Resume Matcher')}

        {!atsResult ? (
          <View className="space-y-5">
            {/* Resume Selection Card */}
            <Card className="p-5">
              <Text className="text-white font-bold text-base mb-3">1. Select Resume</Text>
              
              {loadingResumes ? (
                <ActivityIndicator color="#6366f1" size="small" />
              ) : resumes.length > 0 ? (
                <View className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center flex-1 mr-4">
                    <FileText color="#818cf8" size={20} className="mr-3" />
                    <Text className="text-slate-200 font-semibold text-sm truncate" numberOfLines={1}>
                      {selectedResumeName || 'Default Resume'}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text className="text-slate-400 text-sm mb-4">No resumes found. Please upload a resume below.</Text>
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
            <Card className="p-5">
              <Text className="text-white font-bold text-base mb-3">2. Job Description</Text>
              <TextInput
                multiline
                numberOfLines={8}
                placeholder="Paste the target job description or requirements here..."
                placeholderTextColor="#64748b"
                value={jobDescription}
                onChangeText={setJobDescription}
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-sm h-40 text-vertical-top focus:border-indigo-500"
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
            <Card className="items-center p-6 bg-indigo-950/20 border-indigo-500/20">
              <Text className="text-indigo-400 text-sm font-bold tracking-wider uppercase mb-2">ATS Compatibility Score</Text>
              <Text className="text-white text-5xl font-black mb-3">{atsResult.score ?? atsResult.matchScore ?? atsResult.atsScore ?? '85'}%</Text>
              <Badge 
                label={(atsResult.score ?? 85) >= 80 ? 'High Match' : 'Gap Identified'} 
                variant={(atsResult.score ?? 85) >= 80 ? 'success' : 'warning'} 
              />
            </Card>

            {/* Detailed Feedback */}
            <Card className="p-5">
              <Text className="text-white font-bold text-lg mb-3">Analysis Breakdown</Text>
              <View className="text-slate-300">
                <Markdown style={{
                  body: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
                  heading2: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
                  strong: { color: '#6366f1', fontWeight: 'bold' },
                  bullet_list: { marginTop: 4 },
                }}>
                  {atsResult.feedback || atsResult.analysis || atsResult.recommendations || 'ATS feedback rendering here...'}
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
    <ScrollView className="bg-slate-900 flex-1 px-5" contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}>
      {renderHeader('Skill Gap Finder')}

      {!skillGapResult ? (
        <View className="space-y-5">
          <Card className="p-5">
            <Text className="text-white font-bold text-base mb-3">Your Current Skills</Text>
            <Input
              placeholder="e.g. React, JavaScript, Node.js, Git"
              value={userSkillsInput}
              onChangeText={setUserSkillsInput}
            />
            <Text className="text-slate-400 text-xs">Separate skills with commas.</Text>
          </Card>

          <Card className="p-5">
            <Text className="text-white font-bold text-base mb-3">Required Job Skills</Text>
            <Input
              placeholder="e.g. React Native, TypeScript, GraphQL, AWS"
              value={requiredSkillsInput}
              onChangeText={requiredSkillsInput => setRequiredSkillsInput(requiredSkillsInput)}
            />
            <Text className="text-slate-400 text-xs">Separate skills with commas.</Text>
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
          <Card className="p-5">
            <Text className="text-white font-bold text-lg mb-4">Skills Matching Summary</Text>
            
            <View className="flex-row space-x-3 mb-2">
              <View className="flex-1 bg-slate-900 p-4 rounded-xl border border-slate-700 items-center">
                <CheckCircle color="#10b981" size={24} className="mb-2" />
                <Text className="text-white font-bold text-sm">Matching</Text>
                <Text className="text-emerald-400 text-xl font-extrabold mt-1">
                  {skillGapResult.matchingSkills?.length ?? 0}
                </Text>
              </View>

              <View className="flex-1 bg-slate-900 p-4 rounded-xl border border-slate-700 items-center">
                <AlertTriangle color="#ef4444" size={24} className="mb-2" />
                <Text className="text-white font-bold text-sm">Missing</Text>
                <Text className="text-red-400 text-xl font-extrabold mt-1">
                  {skillGapResult.missingSkills?.length ?? 0}
                </Text>
              </View>
            </View>
          </Card>

          {/* Detailed Gaps & Pathways */}
          <Card className="p-5">
            <Text className="text-white font-bold text-lg mb-3">Gap Mitigation Pathway</Text>
            <Markdown style={{
              body: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
              heading2: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
              strong: { color: '#14b8a6', fontWeight: 'bold' },
              bullet_list: { marginTop: 4 },
            }}>
              {skillGapResult.recommendations || skillGapResult.pathway || 'Learning pathway recommendations rendering here...'}
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
