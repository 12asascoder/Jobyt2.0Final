'use client';

import { useRouter } from 'next/navigation';
import { FaChevronLeft } from 'react-icons/fa6';

export default function EarnCreditsPage() {
  const router = useRouter();

  const earnTasks = [
    { title: 'Daily Streak', subtitle: 'Refreshes everyday at midnight', credits: 20, claimed: true },
    { title: 'Refer & Earn', subtitle: 'For each friend that joins via your signup link', credits: 50, claimed: false },
    { title: 'Complete Profile', subtitle: 'Fill in all profile fields and upload a photo', credits: 150, claimed: false },
    { title: 'Upload Resume', subtitle: 'Upload your resume to unlock full features', credits: 100, claimed: false },
    { title: 'Redeem Code', subtitle: 'Redeem a friend\'s referral code (one-time)', credits: 10, claimed: false },
  ];

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8">
      <h1 className="text-3xl font-display font-medium text-center text-slate-900 tracking-tight">Credits & Plans</h1>

      <div className="relative mt-6 sm:mt-8 mb-6 sm:mb-8 flex items-center justify-center">
        <button
          onClick={() => router.push('/credits')}
          className="absolute left-0 w-9 h-9 sm:w-10 sm:h-10 bg-black rounded-full flex items-center justify-center text-white hover:text-[#c1f237] transition-colors"
        >
          <FaChevronLeft className="text-sm pr-0.5" />
        </button>
        <h2 className="text-[28px] sm:text-3xl font-display font-medium text-slate-900 tracking-tight">Earn Credits</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {earnTasks.map((task, idx) => (
          <div key={idx} className="bg-[#0a0a0a] rounded-xl p-5 sm:p-6 text-center flex flex-col items-center min-h-60 sm:min-h-63.75">
            <h3 className="text-white text-[22px] font-display font-medium mb-1">{task.title}</h3>
            <p className="text-white/40 text-[11px] mb-5">{task.subtitle}</p>

            <div className="mb-0">
              <span className="text-[#c1f237] text-[36px] font-semibold">{task.credits}</span>
            </div>
            <p className="text-[#c1f237] text-[9px] tracking-widest mb-6">CREDITS</p>

            <div className="mt-auto w-full px-0 sm:px-1">
              {task.claimed ? (
                <button disabled className="w-full bg-[#323232] text-[#8e8e8e] py-2.5 rounded-xl font-medium text-[13px] cursor-not-allowed">
                  Claimed
                </button>
              ) : (
                <button className="w-full bg-[#c1f237] hover:bg-[#b0e025] text-black py-2.5 rounded-xl font-medium text-[13px] transition-colors">
                  Claim Credits
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
