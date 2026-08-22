'use client';

import React, { useState } from 'react';
import {
  Trophy, Mail, Lock, Eye, EyeOff, LogIn, CheckCircle2, AlertCircle, RefreshCw, KeyRound, ShieldCheck
} from 'lucide-react';
import type { Subscription, UserRole } from '../types';
import { apiLogin, apiLoginParent } from '../services/apiClient';

interface LoginProps {
  subscriptions: Subscription[];
  onLoginSuccess: (user: {
    email: string;
    role: UserRole;
    name?: string;
    subscriptionId?: string;
    studentName?: string;
    parentLoginId?: string;
  }) => void;
}

const DEMO_CREDENTIALS: Record<'admin' | 'manager', { email: string; password: string }> = {
  admin: { email: 'admin@strikeracademy.edu', password: 'admin123' },
  manager: { email: 'manager@strikeracademy.edu', password: 'manager123' },
};

/**
 * Role-based login for admin, manager, and parent portals. Credentials are
 * validated server-side; demo accounts remain available for testing.
 */
export default function Login({ subscriptions, onLoginSuccess }: LoginProps) {
  const [activeTab, setActiveTab] = useState<UserRole>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [parentLoginId, setParentLoginId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleFillDemo = (type: UserRole): void => {
    setErrorMsg('');
    setSuccessMsg('');
    setActiveTab(type);
    if (type === 'admin' || type === 'manager') {
      setEmail(DEMO_CREDENTIALS[type].email);
      setPassword(DEMO_CREDENTIALS[type].password);
      return;
    }
    const firstWithId = subscriptions.find((s) => s.parentLoginId);
    setParentLoginId(firstWithId?.parentLoginId || '');
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const user =
        activeTab === 'parent'
          ? await apiLoginParent(parentLoginId.trim())
          : await apiLogin(email, activeTab, password);
      setSuccessMsg(
        activeTab === 'manager'
          ? 'Manager access granted. Redirecting...'
          : activeTab === 'admin'
            ? 'Authentication Successful. Redirecting...'
            : `Welcome back, ${user.name || 'Parent'}! Viewing ${user.studentName || 'your child'}'s stats. Redirecting...`
      );
      setTimeout(() => {
        onLoginSuccess({
          email: user.email,
          role: user.role,
          name: user.name,
          subscriptionId: user.subscriptionId,
          studentName: user.studentName,
          parentLoginId: user.parentLoginId,
        });
        setLoading(false);
      }, 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setErrorMsg(message);
      setLoading(false);
    }
  };

  const demoParentIds = Array.from(
    new Set(subscriptions.map((s) => s.parentLoginId).filter(Boolean) as string[])
  ).slice(0, 3);

  const tabLabel = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return 'ADMIN';
      case 'manager':
        return 'MANAGER';
      case 'parent':
        return 'PARENT';
      default: {
        const _exhaustive: never = role;
        return _exhaustive;
      }
    }
  };

  const headingForTab = (): { title: string; subtitle: string } => {
    switch (activeTab) {
      case 'admin':
        return {
          title: 'Administrative Gateway',
          subtitle: 'Authorized personnel only. Access financial ledgers.',
        };
      case 'manager':
        return {
          title: 'Manager Console Login',
          subtitle: 'Attendance, roster, and permitted academy operations.',
        };
      case 'parent':
        return {
          title: 'Parent Portal Login',
          subtitle: 'Enter your unique Parent Login ID — no password needed — to view your child\'s academy stats.',
        };
      default: {
        const _exhaustive: never = activeTab;
        return _exhaustive;
      }
    }
  };

  const headerCopy = headingForTab();

  return (
    <div className="force-dark min-h-screen flex items-center justify-center relative bg-black text-white font-sans overflow-x-hidden">
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center opacity-40 blur-xs transition-opacity duration-1000 scale-105"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCiGVLzFBRnzGGaRl-3PAjR8KwHzEJ7XJ7P96qyHl_GruqP0KKCgbLx_GcBatfxPRVnJ8PtcIOL3dFQ_Djb-TVwkXWRkoyN4Yciu0ZNYB_6belnBlUB0IsUsYcaVYA4NAQuvJSet83j3jJRl03TCLWK26Wv8cE27DnWc9DC31ID17iC4kAc0q1WehFoB4SzmxfIkHnT4GX_1dxLDymDtPpwYzdYN2fsAC0pKOx8yECWwYUGa0_2RQ3mcxyHIVJhe9rB9yo37z8pVs2m')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/60" />
      </div>

      <main className="relative z-10 w-full max-w-md px-4 sm:px-6 py-8 sm:py-12 mx-auto">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 bg-brand-gold flex items-center justify-center rounded-sm mb-4 shadow-lg shadow-brand-gold/10">
            <Trophy className="h-7 w-7 text-black shrink-0" />
          </div>
          <h1 className="font-sans text-2xl font-extrabold text-white tracking-tight">
            PLL Academy
          </h1>
          <p className="font-mono text-[9px] text-brand-gold uppercase tracking-widest mt-1">
            Secure Ledger & Payment Gateway
          </p>
        </div>

        <div className="flex bg-brand-surface-raised p-1 border border-brand-border rounded-xs mb-6">
          {(['admin', 'manager', 'parent'] as UserRole[]).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => {
                setActiveTab(role);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-2 font-sans text-[10px] sm:text-xs font-bold rounded-xs transition-all cursor-pointer ${
                activeTab === role
                  ? 'bg-brand-gold text-black shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tabLabel(role)}
            </button>
          ))}
        </div>

        <div className="bg-brand-surface-raised/80 border border-brand-border rounded-lg p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <header className="mb-6">
            <h2 className="font-sans text-lg font-bold text-white">{headerCopy.title}</h2>
            <p className="font-sans text-xs text-gray-400 mt-1">{headerCopy.subtitle}</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'parent' ? (
              <div className="space-y-1.5">
                <label className="block font-mono text-[9px] uppercase tracking-widest text-gray-400 font-bold" htmlFor="parentLoginId">
                  Parent Login ID
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gold">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <input
                    id="parentLoginId"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="e.g. Thangmin67876"
                    value={parentLoginId}
                    onChange={(e) => setParentLoginId(e.target.value)}
                    className="w-full bg-brand-charcoal border border-brand-border rounded-xs pl-10 pr-4 py-2.5 font-mono text-xs text-white placeholder:text-gray-600 focus:outline-hidden focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all"
                  />
                </div>
                <p className="text-[9px] text-gray-500 font-sans flex items-center gap-1 mt-1">
                  <ShieldCheck className="h-3 w-3 text-brand-emerald shrink-0" />
                  Passwordless — this ID was issued when your child enrolled.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-widest text-gray-400 font-bold" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder={
                        activeTab === 'admin'
                          ? 'admin@strikeracademy.edu'
                          : 'manager@strikeracademy.edu'
                      }
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-brand-charcoal border border-brand-border rounded-xs pl-10 pr-4 py-2.5 font-sans text-xs text-white placeholder:text-gray-600 focus:outline-hidden focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] uppercase tracking-widest text-gray-400 font-bold" htmlFor="password">
                    Secret Passkey
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-brand-charcoal border border-brand-border rounded-xs pl-10 pr-10 py-2.5 font-sans text-xs text-white placeholder:text-gray-600 focus:outline-hidden focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {errorMsg && (
              <div className="bg-brand-cinnabar/10 border border-brand-cinnabar/30 p-3 rounded-xs text-[11px] font-mono text-brand-cinnabar flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-brand-emerald/10 border border-brand-emerald/30 p-3 rounded-xs text-[11px] font-mono text-white flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-emerald shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-gold hover:bg-brand-gold-bright text-black font-bold py-3 rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg shadow-brand-gold/10"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{activeTab === 'parent' ? 'Checking ID...' : 'Verifying Credentials...'}</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>{activeTab === 'parent' ? 'Access Child Portal' : 'Secure Login'}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-brand-border/40 text-center space-y-2">
            <p className="text-[10px] text-gray-400 font-sans">
              Want to skip password entry? Load a demo account:
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              {(['admin', 'manager', 'parent'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleFillDemo(role)}
                  className="text-[9px] font-mono font-bold bg-brand-gold/10 hover:bg-brand-gold/20 text-brand-gold px-2 py-1 rounded-xs border border-brand-gold/20 cursor-pointer"
                >
                  Load {tabLabel(role)}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'parent' && (
            <div className="mt-4 p-2.5 bg-brand-charcoal border border-brand-border rounded-xs">
              <p className="text-[10px] text-gray-400 leading-normal">
                <span className="text-brand-gold font-bold">Demo Parent Login IDs:</span>
                <br />
                {demoParentIds.length > 0 ? (
                  demoParentIds.map((id) => (
                    <code key={id} className="text-white bg-brand-border px-1 rounded-sm text-[9px] mr-1">{id}</code>
                  ))
                ) : (
                  <span>No registered parents yet</span>
                )}
                <br />
                <span className="opacity-80">No password required — just type the ID above.</span>
              </p>
            </div>
          )}

          {activeTab === 'manager' && (
            <div className="mt-4 p-2.5 bg-brand-charcoal border border-brand-border rounded-xs">
              <p className="text-[10px] text-gray-400 leading-normal">
                <span className="text-brand-gold font-bold">Demo manager:</span>{' '}
                manager@strikeracademy.edu / manager123
              </p>
            </div>
          )}

          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent" />
        </div>

        <p className="mt-8 text-center text-[10px] text-gray-500 font-sans uppercase tracking-wider">
          Proprietary System &bull; PLL ACADEMY
        </p>
      </main>
    </div>
  );
}
