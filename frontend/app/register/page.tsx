"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Sparkles } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);

    // Client-side quick checks
    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage("Please enter your full name (at least 2 characters).");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-check.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed. Please try again.");
      }

      // Automatically logged in by the register endpoint cookie
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
            <h1 className="auth-title">Create an Account</h1>
            <p className="auth-subtitle">Join LazyLens to create, style, and export seamless carousels</p>
          </div>

          {errorMessage && (
            <div className="auth-error-box">
              <AlertCircle size={16} className="auth-error-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Full Name Field */}
            <div className="auth-field-group">
              <label htmlFor="reg-name" className="auth-label">
                Full Name
              </label>
              <div className="auth-input-wrapper">
                <User size={16} className="auth-input-icon" />
                <input
                  id="reg-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  required
                  autoComplete="name"
                  className="auth-input"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="auth-field-group">
              <label htmlFor="reg-email" className="auth-label">
                Email Address
              </label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-input-icon" />
                <input
                  id="reg-email"
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
                <label htmlFor="reg-password" className="auth-label">
                  Password
                </label>
                <span className="auth-hint">Min. 8 characters</span>
              </div>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  required
                  autoComplete="new-password"
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

            {/* Confirm Password Field */}
            <div className="auth-field-group">
              <label htmlFor="reg-confirm" className="auth-label">
                Confirm Password
              </label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" />
                <input
                  id="reg-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  autoComplete="new-password"
                  className="auth-input"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="auth-password-toggle"
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !name.trim() || !email.trim() || !password || !confirmPassword}
              className="auth-submit-btn"
            >
              {isLoading ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" />
                  <span>Creating Account…</span>
                </span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="auth-card-footer">
            <span>Already have an account?</span>
            <Link href="/login" className="auth-link">
              Sign In
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
