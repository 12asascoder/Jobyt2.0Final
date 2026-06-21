'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, ShieldCheck } from 'lucide-react';

interface ConsentScreenProps {
  onConsent: (consentGiven: boolean) => void;
  onCancel: () => void;
}

export const ConsentScreen: React.FC<ConsentScreenProps> = ({ onConsent, onCancel }) => {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
            <CardTitle className="text-2xl">Video Interview Consent</CardTitle>
          </div>
          <CardDescription>
            Before we begin the video interview, please review our recording and AI evaluation policies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-50 border-blue-200">
            <InfoIcon className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              This interview will be recorded, transcribed, and evaluated using AI.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3 text-sm text-gray-700">
            <p>By proceeding, you consent to the following:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Video & Audio Recording:</strong> Your webcam and microphone will be recorded during the session.</li>
              <li><strong>AI Transcription:</strong> Your audio will be processed by our Speech-to-Text system to generate a transcript.</li>
              <li><strong>AI Evaluation:</strong> The transcript will be evaluated by an AI model to assess communication and technical skills.</li>
              <li><strong>Employer Access:</strong> The employer will have secure access to the video, transcript, and AI evaluation.</li>
              <li><strong>Data Retention:</strong> Your video and transcript will be automatically deleted after 30 days or if you withdraw your application.</li>
            </ul>
          </div>

          <div className="flex items-start space-x-3 mt-6 pt-4 border-t">
            <Checkbox 
              id="consent" 
              checked={agreed} 
              onCheckedChange={(checked) => setAgreed(checked === true)} 
            />
            <label 
              htmlFor="consent" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I have read and agree to the recording, AI evaluation, and data retention policies.
            </label>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!agreed} onClick={() => onConsent(true)}>
            Start Interview
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
