'use client';

import { ModemAnimatedFooter, defaultJobytSocials } from '@/components/ui/modem-animated-footer';

const companyLinks = [
  { label: 'About Us', href: '#' },
  { label: 'Careers', href: '#' },
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
];

const candidateLinks = [
  { label: 'Explore Internships', href: '#' },
  { label: 'Career Paths', href: '#' },
  { label: 'Resume Builder', href: '#' },
  { label: 'Success Stories', href: '#' },
];

const employerLinks = [
  { label: 'Post a Job', href: '#' },
  { label: 'Pricing', href: '#' },
  { label: 'Hire Talent', href: '#' },
  { label: 'Hiring Guide', href: '#' },
];

export function Footer() {
  return (
    <ModemAnimatedFooter
      brandName="Jobyt"
      poweredByName="SpazorLabs"
      poweredByHref="https://spazorlabs.com"
      companyLinks={companyLinks}
      socialLinks={defaultJobytSocials}
      sections={[
        { title: 'For Candidates', links: candidateLinks },
        { title: 'For Employers', links: employerLinks },
      ]}
    />
  );
}