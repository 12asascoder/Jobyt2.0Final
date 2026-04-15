"use client";

import { ModemAnimatedFooter, defaultJobytSocials } from "@/components/ui/modem-animated-footer";

export default function FooterDemo() {
  return (
    <ModemAnimatedFooter
      brandName="Jobyt"
      poweredByName="SpazorLabs"
      poweredByHref="https://spazorlabs.com"
      socialLinks={defaultJobytSocials}
      companyLinks={[
        { label: "About Us", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
      ]}
      sections={[
        {
          title: "For Candidates",
          links: [
            { label: "Explore Internships", href: "#" },
            { label: "Career Paths", href: "#" },
            { label: "Resume Builder", href: "#" },
            { label: "Success Stories", href: "#" },
          ],
        },
        {
          title: "For Employers",
          links: [
            { label: "Post a Job", href: "#" },
            { label: "Pricing", href: "#" },
            { label: "Hire Talent", href: "#" },
            { label: "Hiring Guide", href: "#" },
          ],
        },
      ]}
    />
  );
}
