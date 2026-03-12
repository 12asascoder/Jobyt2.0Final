'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';
import {
  Navbar,
  HeroSection,
  CompanyMarquee,
  JobCards,
  EmployerSection,
  PricingSection,
  Testimonials,
  Footer,
} from '@/components/landing';

export default function LandingPage() {
  useScrollReveal();

  return (
    <>
      <Navbar />
      <HeroSection />
      <CompanyMarquee />
      <JobCards />
      <EmployerSection />
      <PricingSection />
      <Testimonials />
      <Footer />
    </>
  );
}
