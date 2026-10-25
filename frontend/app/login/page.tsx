"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Sparkles } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPath = searchParams.get("from") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed. Please check your credentials.");
      }

      // Safe redirect preventing open-redirects
      const safeTarget = fromPath.startsWith("/") && !fromPath.startsWith("//") ? fromPath : "/";
      router.push(safeTarget);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {errorMessage && (
        <div className="auth-error-box">
          <AlertCircle size={16} className="auth-error-icon" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Email Field */}
      <div className="auth-field-group">
        <label htmlFor="login-email" className="auth-label">
          Email Address
        </label>
        <div className="auth-input-wrapper">
          <Mail size={16} className="auth-input-icon" />
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            autoComplete="email"
            className="auth-input"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="auth-field-group">
        <div className="auth-label-row">
          <label htmlFor="login-password" className="auth-label">
            Password
          </label>
        </div>
        <div className="auth-input-wrapper">
          <Lock size={16} className="auth-input-icon" />
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            className="auth-input"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="auth-password-toggle"
            title={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !email.trim() || !password}
        className="auth-submit-btn"
      >
        {isLoading ? (
          <span className="auth-btn-loading">
            <span className="auth-spinner" />
            <span>Logging in…</span>
          </span>
        ) : (
          <>
            <span>Sign In</span>
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-viewport">
      {/* Background ambient lighting glows */}
      <div className="auth-glow auth-glow-1" />
      <div className="auth-glow auth-glow-2" />

      <div className="auth-container">
        {/* Top Brand Header */}
        <div className="auth-brand-block">
          <div className="sidebar-brand-logo auth-logo-box">
            <Layers size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <div className="auth-brand-text">
            <span className="auth-brand-name">LazyLens</span>
            <span className="sidebar-brand-badge">STUDIO</span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="auth-card">
          <div className="auth-card-header">
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Log in to continue creating your social carousels</p>
          </div>

          <Suspense fallback={<div style={{ minHeight: "200px" }} />}>
            <LoginForm />
          </Suspense>

          {/* Footer Link */}
          <div className="auth-card-footer">
            <span>Don't have an account?</span>
            <Link href="/register" className="auth-link">
              Create one now
            </Link>
          </div>
        </div>

        {/* Bottom Feature Pill */}
        <div className="auth-feature-pill">
          <Sparkles size={13} className="text-purple-400" />
          <span>Zero-Touch Deterministic Layouts & AI Studio</span>
        </div>
      </div>
    </div>
  );
}
