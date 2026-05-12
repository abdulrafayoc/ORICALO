'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Send } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Password reset requested for:', email);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="w-full text-center">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 mx-auto">
          <Send className="w-8 h-8 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
        <p className="text-neutral-500 text-sm mb-8 leading-relaxed">
          We&apos;ve sent a password reset link to <span className="text-white font-medium">{email}</span>
        </p>
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-emerald-500 hover:text-emerald-400 font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
          <span className="text-black font-bold text-2xl">O</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Reset password</h1>
        <p className="text-neutral-500 text-sm mt-2">Enter your email to receive a reset link</p>
      </div>

      <div className="bg-neutral-900 border border-white/5 rounded-2xl p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-500 text-black font-bold py-3 rounded-xl hover:bg-emerald-400 transition-all"
          >
            Send Reset Link
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
