"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(formData.email, formData.password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col items-center mb-8 text-center">
        <h1 className="font-serif text-3xl text-foreground mb-2">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Enter your details to access your account.
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
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="name@company.com"
                leftIcon={<Mail className="w-4 h-4" />}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="font-mono text-[10px] uppercase tracking-[0.08em] text-accent hover:text-accent/80"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4" />}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2"
              size="lg"
            >
              {loading ? "Authenticating..." : "Sign in"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <div className="mt-7 pt-5 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              No account yet?{" "}
              <Link
                href="/signup"
                className="text-foreground hover:text-accent font-medium transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="mt-6 px-4 py-3 border border-dashed border-border rounded-md">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-center text-muted-foreground">
          Demo &middot;{" "}
          <span className="text-foreground">demo@oricalo.com</span> /{" "}
          <span className="text-foreground">demo1234</span>
        </p>
      </div>
    </div>
  );
}
