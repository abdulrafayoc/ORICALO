"use client";

import React, { useState } from "react";
import Link from "next/link";
import { User, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";

export default function SignupPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.fullName,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Signup failed");
      }
      await login(formData.email, formData.password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account");
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col items-center mb-8 text-center">
        <h1 className="font-serif text-3xl text-foreground mb-2">
          Create your account
        </h1>
        <p className="text-muted-foreground text-sm">
          Start your 14-day free trial today.
        </p>
      </div>

      <Card>
        <CardBody className="p-7 pt-7">
          {error && (
            <div className="mb-5 px-3 py-2.5 bg-destructive/10 border border-destructive/30 rounded-md flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-mono text-[11px] uppercase tracking-[0.08em]">
                {error}
              </span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2"
              >
                Full name
              </label>
              <Input
                id="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                placeholder="Huzaifa Ahmed"
                leftIcon={<User className="w-4 h-4" />}
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2"
              >
                Work email
              </label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="you@agency.com"
                leftIcon={<Mail className="w-4 h-4" />}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-2"
              >
                Confirm password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
              />
            </div>

            <div className="flex items-start gap-3 pt-1">
              <input
                id="terms"
                type="checkbox"
                required
                checked={formData.agreeTerms}
                onChange={(e) =>
                  setFormData({ ...formData, agreeTerms: e.target.checked })
                }
                className="mt-0.5 w-4 h-4 rounded-sm border-border bg-input text-accent focus:ring-1 focus:ring-ring"
              />
              <label
                htmlFor="terms"
                className="text-xs text-muted-foreground leading-relaxed"
              >
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="text-foreground hover:text-accent transition-colors"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-foreground hover:text-accent transition-colors"
                >
                  Privacy Policy
                </Link>
                .
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2"
              size="lg"
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="mt-7 pt-5 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-foreground hover:text-accent font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
