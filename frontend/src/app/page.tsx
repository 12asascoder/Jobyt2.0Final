import Link from 'next/link';
import { ROUTES } from '@/constants';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-xl font-bold text-blue-600">Hiring Platform</span>
          <div className="flex items-center gap-4">
            <Link href={ROUTES.login} className="text-sm font-medium text-gray-600 hover:text-blue-600">Sign in</Link>
            <Link href={ROUTES.register} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Get started free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
          🎉 150 free credits on sign-up
        </div>
        <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-gray-900">
          Find your next role.<br />
          <span className="text-blue-600">Hire top talent.</span>
        </h1>
        <p className="mb-10 text-xl text-gray-500">
          A two-sided hiring marketplace that connects great candidates with great companies — powered by AI matching.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href={ROUTES.register} className="rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-blue-700">
            Find a job
          </Link>
          <Link href={`${ROUTES.register}?role=recruiter`} className="rounded-xl border border-gray-300 px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50">
            Post a job
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="bg-gray-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              { icon: '🤖', title: 'AI Job Matching', desc: 'Smart recommendations based on your skills and experience.' },
              { icon: '⚡', title: 'Credit Economy', desc: 'Fair, transparent pricing. Earn credits, use them when you need.' },
              { icon: '💬', title: 'Real-time Messaging', desc: 'Chat directly with recruiters and candidates, no email chains.' },
            ].map((f) => (
              <div key={f.title} className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-3 text-3xl">{f.icon}</div>
                <h3 className="mb-2 font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-20 text-center">
        <h2 className="mb-4 text-3xl font-bold text-gray-900">Ready to get started?</h2>
        <p className="mb-8 text-gray-500">Join thousands of professionals already on the platform.</p>
        <Link href={ROUTES.register} className="rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-blue-700">
          Create free account
        </Link>
      </div>
    </div>
  );
}
