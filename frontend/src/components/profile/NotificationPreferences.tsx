'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import { Card, CardBody, Button, Spinner } from '@/components/ui';
import toast from 'react-hot-toast';
import { FaEnvelope, FaWhatsapp, FaXmark } from 'react-icons/fa6';

type UserPreferences = {
  email_alerts_enabled: boolean;
  whatsapp_alerts_enabled: boolean;
};

type UserMeResponse = {
  email_verified?: boolean;
  phone_verified?: boolean;
  email?: string;
  phone?: string;
};

export function NotificationPreferences() {
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<UserPreferences>({ email_alerts_enabled: true, whatsapp_alerts_enabled: true });
  const [userContext, setUserContext] = useState<UserMeResponse>({});
  
  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [verifyingChannel, setVerifyingChannel] = useState<'email' | 'whatsapp' | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const fetchPreferences = useCallback(async () => {
    try {
      const [prefRes, meRes] = await Promise.all([
        api.get<UserPreferences>('/users/me/preferences'),
        api.get<{ profile: any; email: string }>('/users/me')
      ]);
      setPreferences(prefRes.data || { email_alerts_enabled: false, whatsapp_alerts_enabled: false });
      
      const authMeRes = await api.get<any>('/auth/me').catch(() => ({ data: null }));
      const userFull = authMeRes.data || meRes.data?.profile || {};
      
      setUserContext({
        email_verified: userFull.email_verified,
        phone_verified: userFull.phone_verified,
        email: meRes.data?.email,
        phone: meRes.data?.profile?.phone,
      });
    } catch (err) {
      console.error('Failed to load preferences', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPreferences();
  }, [fetchPreferences]);

  const updatePreference = async (channel: 'email' | 'whatsapp', enabled: boolean) => {
    try {
      const payload = channel === 'email' 
        ? { email_alerts_enabled: enabled } 
        : { whatsapp_alerts_enabled: enabled };
      
      await api.put('/users/me/preferences', payload);
      setPreferences(prev => ({ ...prev, ...payload }));
      toast.success(`${channel === 'email' ? 'Email' : 'WhatsApp'} alerts ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update preference');
    }
  };

  const handleToggle = (channel: 'email' | 'whatsapp') => {
    const isCurrentlyEnabled = channel === 'email' ? preferences.email_alerts_enabled : preferences.whatsapp_alerts_enabled;
    const isVerified = channel === 'email' ? userContext.email_verified : userContext.phone_verified;
    const identifier = channel === 'email' ? userContext.email : userContext.phone;
    
    // Disabling doesn't require verification
    if (isCurrentlyEnabled) {
      return updatePreference(channel, false);
    }

    // Enabling requires verified identifier
    if (!identifier) {
      return toast.error(`Please add a ${channel === 'email' ? 'valid email' : 'phone number'} to your profile first.`);
    }

    if (!isVerified) {
      // Trigger OTP flow
      setVerifyingChannel(channel);
      setOtpSent(false);
      setOtpCode('');
      setShowOtpModal(true);
      return;
    }

    // Already verified, just enable
    return updatePreference(channel, true);
  };

  const sendOtp = async () => {
    if (!verifyingChannel) return;
    setOtpSending(true);
    try {
      await api.post('/auth/otp/send', { channel: verifyingChannel });
      setOtpSent(true);
      toast.success(`OTP sent to your ${verifyingChannel}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to send OTP');
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!verifyingChannel || otpCode.length !== 6) {
      return toast.error('Please enter a valid 6-digit OTP');
    }
    setOtpVerifying(true);
    try {
      await api.post('/auth/otp/verify', { channel: verifyingChannel, code: otpCode });
      toast.success(`${verifyingChannel === 'email' ? 'Email' : 'WhatsApp'} verified successfully!`);
      
      // Update local context
      setUserContext(prev => ({
        ...prev,
        ...(verifyingChannel === 'email' ? { email_verified: true } : { phone_verified: true })
      }));
      
      // Automatically enable the alert
      await updatePreference(verifyingChannel, true);
      setShowOtpModal(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Invalid OTP');
    } finally {
      setOtpVerifying(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-6"><Spinner size="sm" /></div>;
  }

  return (
    <>
      <div className="bg-white rounded-[20px] p-6 shadow-sm border border-[#e8e4db] w-full">
        <h3 className="font-normal text-black mb-1 text-[18px] leading-6">Notification Preferences</h3>
        <p className="text-sm text-gray-500 mb-6">Manage how you receive personalized job updates and alerts.</p>
        
        <div className="space-y-4">
          {/* Email Alerts Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${preferences.email_alerts_enabled ? 'bg-lime-400/20 text-lime-600' : 'bg-gray-100 text-gray-400'}`}>
                <FaEnvelope className="text-lg" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Email Alerts</p>
                <p className="text-xs text-gray-500">Receive job matches and updates via email</p>
                {!userContext.email_verified && <p className="text-[10px] text-amber-500 font-medium mt-1">Verification required to enable</p>}
              </div>
            </div>
            <button
              onClick={() => handleToggle('email')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.email_alerts_enabled ? 'bg-lime-400' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.email_alerts_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* WhatsApp Alerts Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${preferences.whatsapp_alerts_enabled ? 'bg-green-500/20 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                <FaWhatsapp className="text-xl" />
              </div>
              <div>
                <p className="font-medium text-gray-900">WhatsApp Alerts</p>
                <p className="text-xs text-gray-500">Get instant personalized job updates on WhatsApp</p>
                {!userContext.phone_verified && <p className="text-[10px] text-amber-500 font-medium mt-1">Verification required to enable</p>}
              </div>
            </div>
            <button
              onClick={() => handleToggle('whatsapp')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.whatsapp_alerts_enabled ? 'bg-lime-400' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.whatsapp_alerts_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-brand">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowOtpModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <FaXmark className="text-lg" />
            </button>
            
            <div className="w-12 h-12 rounded-full bg-lime-400/20 mx-auto flex items-center justify-center mb-4 mt-2">
              {verifyingChannel === 'email' ? <FaEnvelope className="text-xl text-lime-600" /> : <FaWhatsapp className="text-xl text-green-600" />}
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">Verify {verifyingChannel === 'email' ? 'Email' : 'WhatsApp'}</h3>
            <p className="text-gray-500 text-sm mb-6 px-2 leading-relaxed">
              We need to verify your {verifyingChannel === 'email' ? 'email address' : 'phone number'} before enabling alerts.
            </p>

            {!otpSent ? (
              <Button 
                onClick={sendOtp} 
                isLoading={otpSending} 
                className="w-full bg-[#c3ff3d] text-black hover:bg-[#aee62d]"
              >
                Send Verification Code
              </Button>
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-lime-400"
                />
                <Button 
                  onClick={verifyOtp} 
                  isLoading={otpVerifying}
                  disabled={otpCode.length !== 6}
                  className="w-full bg-[#c3ff3d] text-black hover:bg-[#aee62d]"
                >
                  Verify & Enable
                </Button>
                <button 
                  onClick={sendOtp} 
                  disabled={otpSending}
                  className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors underline underline-offset-2"
                >
                  Resend Code
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
