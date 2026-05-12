import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <Link href="/" className="inline-flex items-center gap-2 text-emerald-500 hover:text-emerald-400 mb-12 font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      
      <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
      
      <div className="space-y-8 text-neutral-400 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the ORICALO platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4">2. Description of Service</h2>
          <p>
            ORICALO provides an AI-powered voice platform for real estate lead qualification and customer service. We reserve the right to modify or discontinue any part of the service at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4">3. User Responsibilities</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to use the service in compliance with all applicable laws and regulations in Pakistan.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4">4. Intellectual Property</h2>
          <p>
            The service, including its original content, features, and functionality, is and will remain the exclusive property of ORICALO and its licensors.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4">5. Limitation of Liability</h2>
          <p>
            ORICALO shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
          </p>
        </section>

        <section className="pt-8 border-t border-white/5">
          <p className="text-sm">
            Last updated: May 2026. For questions, please contact legal@oricalo.com.
          </p>
        </section>
      </div>
    </div>
  );
}
