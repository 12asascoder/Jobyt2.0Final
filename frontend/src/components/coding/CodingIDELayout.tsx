'use client';

import { useState } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { CodeEditor } from './CodeEditor';
import { CodingLanguage, ProblemVersion, RunResult, CodingSubmission, CodeEvaluation } from '@/types/coding';
import { cn } from '@/lib/utils';

type RightTab = 'output' | 'tests' | 'history' | 'ai';

interface CodingIDELayoutProps {
  problem: ProblemVersion;
  language: CodingLanguage;
  onLanguageChange: (lang: CodingLanguage) => void;
  code: string;
  onCodeChange: (code: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  isRunning: boolean;
  isSubmitting: boolean;
  runResults: RunResult[];
  submissions: CodingSubmission[];
  evaluation: CodeEvaluation | null;
  remainingSeconds?: number | null;
  showSubmit?: boolean;
}

const LANG_LABELS: Record<CodingLanguage, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  java: 'Java',
  cpp: 'C++',
};

function formatTime(seconds: number | null | undefined) {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CodingIDELayout({
  problem,
  language,
  onLanguageChange,
  code,
  onCodeChange,
  onRun,
  onSubmit,
  isRunning,
  isSubmitting,
  runResults,
  submissions,
  evaluation,
  remainingSeconds,
  showSubmit = true,
}: CodingIDELayoutProps) {
  const [activeTab, setActiveTab] = useState<RightTab>('output');

  const tabs: { id: RightTab; label: string }[] = [
    { id: 'output', label: 'Output' },
    { id: 'tests', label: 'Test Results' },
    { id: 'history', label: 'Submissions' },
    { id: 'ai', label: 'AI Feedback' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#1a1a1a] border-b border-white/10">
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as CodingLanguage)}
          className="bg-[#0b1120] text-white border border-white/20 rounded-lg px-3 py-1.5 text-sm"
        >
          {problem.supported_languages.map((lang) => (
            <option key={lang} value={lang}>{LANG_LABELS[lang as CodingLanguage] || lang}</option>
          ))}
        </select>

        {remainingSeconds != null && (
          <Badge className="bg-orange-900/50 text-orange-300 border-orange-700">
            {formatTime(remainingSeconds)}
          </Badge>
        )}

        <Badge className={cn(
          problem.difficulty === 'easy' && 'bg-green-900/40 text-green-300',
          problem.difficulty === 'medium' && 'bg-yellow-900/40 text-yellow-300',
          problem.difficulty === 'hard' && 'bg-red-900/40 text-red-300',
        )}>
          {problem.difficulty}
        </Badge>

        <div className="flex-1" />

        <Button variant="outline" onClick={onRun} isLoading={isRunning} className="border-white/20 text-white hover:bg-white/10">
          Run
        </Button>
        {showSubmit && (
          <Button variant="brand" onClick={onSubmit} isLoading={isSubmitting}>
            Submit
          </Button>
        )}
      </div>

      {/* 3-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Problem */}
        <div className="w-80 shrink-0 overflow-y-auto border-r border-white/10 bg-white/5 p-4">
          <h2 className="text-lg font-bold text-slate-900 mb-3">{problem.title}</h2>
          <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap mb-4">
            {problem.description}
          </div>
          {problem.constraints && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Constraints</h3>
              <pre className="text-xs text-slate-600 whitespace-pre-wrap">{problem.constraints}</pre>
            </div>
          )}
          {problem.sample_cases && problem.sample_cases.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Examples</h3>
              {problem.sample_cases.map((ex, i) => (
                <Card key={i} className="mb-2 bg-slate-50">
                  <CardBody className="p-3 text-xs">
                    <div><span className="font-medium">Input:</span><pre className="mt-1 bg-slate-100 p-2 rounded">{ex.input}</pre></div>
                    <div className="mt-2"><span className="font-medium">Output:</span><pre className="mt-1 bg-slate-100 p-2 rounded">{ex.expected_output}</pre></div>
                    {ex.explanation && <p className="mt-2 text-slate-500">{ex.explanation}</p>}
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
          {problem.hints && problem.hints.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Hints</h3>
              <ul className="text-xs text-slate-600 list-disc pl-4">
                {problem.hints.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Center: Editor */}
        <div className="flex-1 min-w-0">
          <CodeEditor language={language} value={code} onChange={onCodeChange} height="100%" />
        </div>

        {/* Right: Tabs */}
        <div className="w-96 shrink-0 flex flex-col border-l border-white/10 bg-white">
          <div className="flex border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 px-2 py-2 text-xs font-medium transition-colors',
                  activeTab === tab.id ? 'text-slate-900 border-b-2 border-lime-500' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 text-sm">
            {activeTab === 'output' && (
              <div className="space-y-2">
                {runResults.length === 0 ? (
                  <p className="text-slate-400 text-xs">Run your code to see output</p>
                ) : runResults.map((r, i) => (
                  <div key={i} className="border rounded-lg p-2">
                    <Badge className={r.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {r.passed ? 'Passed' : 'Failed'}
                    </Badge>
                    {r.stdout && <pre className="mt-2 text-xs bg-slate-50 p-2 rounded whitespace-pre-wrap">{r.stdout}</pre>}
                    {r.stderr && <pre className="mt-1 text-xs bg-red-50 text-red-700 p-2 rounded whitespace-pre-wrap">{r.stderr}</pre>}
                    {r.compileOutput && <pre className="mt-1 text-xs bg-yellow-50 p-2 rounded whitespace-pre-wrap">{r.compileOutput}</pre>}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'tests' && (
              <div className="space-y-2">
                {runResults.length === 0 ? (
                  <p className="text-slate-400 text-xs">Test results appear after Run or Submit</p>
                ) : runResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={r.passed ? 'text-green-600' : 'text-red-600'}>{r.passed ? '✓' : '✗'}</span>
                    <span>Case {i + 1}</span>
                    {r.time != null && <span className="text-slate-400">{r.time}s</span>}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-2">
                {submissions.length === 0 ? (
                  <p className="text-slate-400 text-xs">No submissions yet</p>
                ) : submissions.map((s) => (
                  <div key={s.id} className="border rounded-lg p-2 text-xs">
                    <div className="flex justify-between">
                      <span>Attempt #{s.attempt_number}</span>
                      <Badge className={s.passed ? 'bg-green-100 text-green-700' : s.passed === false ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}>
                        {s.status === 'pending' || s.status === 'running' ? s.status : s.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    </div>
                    {s.score != null && <p className="text-slate-500 mt-1">Score: {s.score}%</p>}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-3 text-xs">
                {!evaluation ? (
                  <p className="text-slate-400">AI feedback available after submission completes</p>
                ) : (
                  <>
                    <p className="text-slate-500 italic">{evaluation.disclaimer || 'AI feedback is informational and does not affect pass/fail.'}</p>
                    {evaluation.overall_quality_score != null && (
                      <p className="font-semibold">Quality Score: {evaluation.overall_quality_score}/100</p>
                    )}
                    {evaluation.strengths?.length > 0 && (
                      <div>
                        <p className="font-medium text-green-700">Strengths</p>
                        <ul className="list-disc pl-4">{evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </div>
                    )}
                    {evaluation.weaknesses?.length > 0 && (
                      <div>
                        <p className="font-medium text-red-700">Weaknesses</p>
                        <ul className="list-disc pl-4">{evaluation.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
                      </div>
                    )}
                    {evaluation.suggestions?.length > 0 && (
                      <div>
                        <p className="font-medium text-blue-700">Suggestions</p>
                        <ul className="list-disc pl-4">{evaluation.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
