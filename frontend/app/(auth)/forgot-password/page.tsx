"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Password reset requested for:", email);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="w-full">
        <Card>
          <CardBody className="p-2">
            <EmptyState
              icon={<Send className="w-8 h-8 text-accent" />}
              title="Check your email"
              description={`We've sent a password reset link to ${email}. The link expires in 30 minutes.`}
              action={
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-accent hover:text-accent/80 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to login
                </Link>
              }
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col items-center mb-8 text-center">
        <h1 className="font-serif text-3xl text-foreground mb-2">
          Reset password
        </h1>
        <p className="text-muted-foreground text-sm">
          Enter your email to receive a reset link.
        </p>
      </div>

      <Card>
        <CardBody className="p-7 pt-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                leftIcon={<Mail className="w-4 h-4" />}
              />
            </div>

            <Button type="submit" className="w-full mt-2" size="lg">
              Send reset link
            </Button>
          </form>

          <div className="mt-7 pt-5 border-t border-border text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to login
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
