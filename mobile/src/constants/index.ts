export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export const COLORS = {
  primary: '#6366f1', // Indigo
  primaryLight: '#818cf8',
  secondary: '#14b8a6', // Teal
  background: '#0f172a', // Slate 900
  card: '#1e293b', // Slate 800
  text: '#f8fafc', // Slate 50
  textMuted: '#94a3b8', // Slate 400
  border: '#334155', // Slate 700
  error: '#ef4444', // Red 500
  success: '#10b981', // Emerald 500
  warning: '#f59e0b', // Amber 500
};

export const ROUTES = {
  auth: {
    login: '/(auth)/login',
    register: '/(auth)/register',
    forgotPassword: '/(auth)/forgot-password',
  },
  tabs: {
    home: '/(tabs)/home',
    jobs: '/(tabs)/jobs',
    applications: '/(tabs)/applications',
    careerCoach: '/(tabs)/career-coach',
    profile: '/(tabs)/profile',
  },
};

export enum Role {
  APPLICANT = 'applicant',
  RECRUITER = 'recruiter',
}

export enum ApplicationStatus {
  APPLIED = 'applied',
  IN_REVIEW = 'in_review',
  SHORTLISTED = 'shortlisted',
  INTERVIEW = 'interview',
  OFFER = 'offer',
  HIRED = 'hired',
  REJECTED = 'rejected',
}

export enum NotificationType {
  JOB_MATCH = 'job_match',
  APPLICATION_STATUS = 'application_status',
  NEW_MESSAGE = 'new_message',
  REFERRAL_JOINED = 'referral_joined',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILURE = 'payment_failure',
  LOW_CREDIT = 'low_credit',
}
