'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CodingApi } from '@/lib/api/coding.api';
import { CodingLanguage, CodingSubmission, CodeEvaluation, ProblemVersion, RunResult } from '@/types/coding';
import toast from 'react-hot-toast';

interface UseCodingIDEOptions {
  problemVersionId: string;
  practiceSessionId?: string;
  assessmentSessionId?: string;
  onSubmitComplete?: (submission: CodingSubmission) => void;
}

export function useCodingIDE({ problemVersionId, practiceSessionId, assessmentSessionId, onSubmitComplete }: UseCodingIDEOptions) {
  const [problem, setProblem] = useState<ProblemVersion | null>(null);
  const [language, setLanguage] = useState<CodingLanguage>('python');
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResults, setRunResults] = useState<RunResult[]>([]);
  const [submissions, setSubmissions] = useState<CodingSubmission[]>([]);
  const [evaluation, setEvaluation] = useState<CodeEvaluation | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await CodingApi.getProblemVersion(problemVersionId);
      const p = res.data;
      if (!p) return;
      setProblem(p);
      const defaultLang = (p.supported_languages[0] || 'python') as CodingLanguage;
      setLanguage(defaultLang);
      setCode(p.starter_code[defaultLang] || '');
    };
    void load();
  }, [problemVersionId]);

  useEffect(() => {
    if (!assessmentSessionId) return;
    const heartbeat = async () => {
      try {
        const res = await CodingApi.heartbeat(assessmentSessionId);
        if (res.data) setRemainingSeconds(res.data.remaining_time_seconds);
      } catch {
        /* session may have expired */
      }
    };
    void heartbeat();
    const interval = setInterval(heartbeat, 30000);
    return () => clearInterval(interval);
  }, [assessmentSessionId]);

  const handleLanguageChange = useCallback((lang: CodingLanguage) => {
    if (!problem) return;
    setLanguage(lang);
    setCode(problem.starter_code[lang] || '');
  }, [problem]);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    try {
      const res = await CodingApi.runCode({
        problemVersionId,
        language,
        sourceCode: code,
        practiceSessionId,
        assessmentSessionId,
      });
      setRunResults(res.data?.results ?? []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setIsRunning(false);
    }
  }, [problemVersionId, language, code, practiceSessionId, assessmentSessionId]);

  const pollSubmission = useCallback((submissionId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await CodingApi.getSubmission(submissionId);
        const sub = res.data;
        if (!sub) return;
        if (sub.status === 'completed' || sub.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setSubmissions((prev) => [sub, ...prev.filter((s) => s.id !== sub.id)]);
          if (sub.evaluation) setEvaluation(sub.evaluation);
          else {
            const evalRes = await CodingApi.getEvaluation(submissionId);
            if (evalRes.data) setEvaluation(evalRes.data);
          }
          onSubmitComplete?.(sub);
          toast.success(sub.passed ? 'All tests passed!' : 'Submission evaluated');
        }
      } catch { /* keep polling */ }
    }, 2000);
  }, [onSubmitComplete]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const res = await CodingApi.submitCode({
        problemVersionId,
        language,
        sourceCode: code,
        practiceSessionId,
        assessmentSessionId,
      });
      const sub = res.data;
      if (!sub) return;
      setSubmissions((prev) => [sub, ...prev]);
      pollSubmission(sub.id);
      toast.success('Submission queued for evaluation');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [problemVersionId, language, code, practiceSessionId, assessmentSessionId, pollSubmission]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  return {
    problem,
    language,
    code,
    setCode,
    handleLanguageChange,
    handleRun,
    handleSubmit,
    isRunning,
    isSubmitting,
    runResults,
    submissions,
    evaluation,
    remainingSeconds,
  };
}
