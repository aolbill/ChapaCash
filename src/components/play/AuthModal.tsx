"use client";

import { setCachedSession, type CachedMe } from "@/components/layout/session-cache";
import { api } from "@/components/ui/api";
import { FormEvent, useEffect, useState } from "react";

type Mode = "login" | "register";

type AuthUser = CachedMe;

export function AuthModal({
  mode,
  onMode,
  onClose,
  onAuthed,
}: {
  mode: Mode;
  onMode: (mode: Mode) => void;
  onClose: () => void;
  onAuthed?: () => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    setError(null);
  }, [mode]);

  async function submitLogin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ user: AuthUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      setCachedSession(data.user);
      onAuthed?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitRegister(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ user: AuthUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          phone,
          email: email || undefined,
          password,
          displayName,
          ageConfirmed,
        }),
      });
      setCachedSession(data.user);
      onAuthed?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(4,5,8,.72)] p-4 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[380px] rounded-[18px] border border-[#2a2c34] bg-[#16171b] p-[22px] text-[#f2f3f7] shadow-[0_20px_60px_rgba(0,0,0,.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-4 top-3 text-2xl leading-none text-[#8b8e99]"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {mode === "login" ? (
          <>
            <h2 className="text-xl font-extrabold">Log in</h2>
            <p className="mb-[18px] mt-1 text-[13px] text-[#8b8e99]">Use your Kenyan phone number or email.</p>
            <form onSubmit={submitLogin}>
              <label className="mb-1 mt-3 block text-xs text-[#8b8e99]">Phone or email</label>
              <input
                className="w-full rounded-[10px] border border-[#2a2c34] bg-[#0d0d0f] px-3 py-3 text-[15px] text-[#f2f3f7] outline-none focus:border-[#2fbf4e]"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
                placeholder="0712 345 678"
              />
              <label className="mb-1 mt-3 block text-xs text-[#8b8e99]">Password</label>
              <input
                className="w-full rounded-[10px] border border-[#2a2c34] bg-[#0d0d0f] px-3 py-3 text-[15px] text-[#f2f3f7] outline-none focus:border-[#2fbf4e]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
              {error ? <p className="mt-2.5 min-h-3.5 text-xs text-[#ff6b76]">{error}</p> : null}
              <button
                disabled={busy}
                className="mt-[18px] w-full rounded-[11px] bg-gradient-to-b from-[#2fbf4e] to-[#249b3e] py-3.5 text-[15px] font-extrabold text-white disabled:opacity-50"
              >
                {busy ? "Signing in…" : "Log in"}
              </button>
            </form>
            <p className="mt-3.5 text-center text-[13px] text-[#8b8e99]">
              No account?{" "}
              <button type="button" className="font-bold text-[#2fbf4e]" onClick={() => onMode("register")}>
                Register
              </button>
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-extrabold">Register</h2>
            <p className="mb-[18px] mt-1 text-[13px] text-[#8b8e99]">Free credits to practice. Deposits use M-PESA.</p>
            <form onSubmit={submitRegister}>
              <label className="mb-1 mt-3 block text-xs text-[#8b8e99]">Display name</label>
              <input
                className="w-full rounded-[10px] border border-[#2a2c34] bg-[#0d0d0f] px-3 py-3 text-[15px] text-[#f2f3f7] outline-none focus:border-[#2fbf4e]"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={2}
              />
              <label className="mb-1 mt-3 block text-xs text-[#8b8e99]">Phone (M-PESA)</label>
              <input
                className="w-full rounded-[10px] border border-[#2a2c34] bg-[#0d0d0f] px-3 py-3 text-[15px] text-[#f2f3f7] outline-none focus:border-[#2fbf4e]"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                inputMode="tel"
                placeholder="0712 345 678"
                required
                autoComplete="tel"
              />
              <label className="mb-1 mt-3 block text-xs text-[#8b8e99]">Email (optional)</label>
              <input
                className="w-full rounded-[10px] border border-[#2a2c34] bg-[#0d0d0f] px-3 py-3 text-[15px] text-[#f2f3f7] outline-none focus:border-[#2fbf4e]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
              />
              <label className="mb-1 mt-3 block text-xs text-[#8b8e99]">Password</label>
              <input
                className="w-full rounded-[10px] border border-[#2a2c34] bg-[#0d0d0f] px-3 py-3 text-[15px] text-[#f2f3f7] outline-none focus:border-[#2fbf4e]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="mt-1 text-[11px] text-[#8b8e99]">At least 8 characters, with uppercase, lowercase, and a number.</p>
              <label className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-[#8b8e99]">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  required
                />
                I am 18 or older. Deposits are real money via M-PESA.
              </label>
              {error ? <p className="mt-2.5 min-h-3.5 text-xs text-[#ff6b76]">{error}</p> : null}
              <button
                disabled={busy}
                className="mt-[18px] w-full rounded-[11px] bg-gradient-to-b from-[#2fbf4e] to-[#249b3e] py-3.5 text-[15px] font-extrabold text-white disabled:opacity-50"
              >
                {busy ? "Creating…" : "Register"}
              </button>
            </form>
            <p className="mt-3.5 text-center text-[13px] text-[#8b8e99]">
              Already registered?{" "}
              <button type="button" className="font-bold text-[#2fbf4e]" onClick={() => onMode("login")}>
                Log in
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}