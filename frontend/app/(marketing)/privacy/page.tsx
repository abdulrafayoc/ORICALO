import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <Link href="/" className="inline-flex items-center gap-2 text-emerald-500 hover:text-emerald-400 mb-12 font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      
      <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
      
      <div className="space-y-8 text-neutral-400 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-white mb-4">1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us when you create an account, use our services, or communicate with us. This may include your name, email address, company information, and any voice data processed by our AI agents during sessions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4">2. How We Use Information</h2>
          <p>
            We use the information we collect to provide, maintain, and improve our services, including to process voice-to-text, generate AI responses, and provide analytics. We also use information to communicate with you about updates and support.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4">3. Data Security</h2>
          <p>
            We implement reasonable security measures to protect your information. All transcripts are PII-redacted (e.g., phone numbers and CNICs) before storage. Data is encrypted both at rest and in transit using industry-standard protocols.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4">4. Cookies and Tracking</h2>
          <p>
            We use cookies to improve your browsing experience and analyze our website traffic. You can manage your cookie preferences through the banner on our website or your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4">5. Your Rights</h2>
          <p>
            Depending on your location, you may have certain rights regarding your personal information, such as the right to access, correct, or delete your data. Please contact us to exercise these rights.
          </p>
        </section>

        <section className="pt-8 border-t border-white/5">
          <p className="text-sm">
            Last updated: May 2026. For questions, please contact privacy@oricalo.com.
          </p>
        </section>
      </div>
    </div>
  );
}
