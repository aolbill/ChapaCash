"use client";

import { useSyncExternalStore } from "react";

type Me = {
  id: string;
  email: string | null;
  displayName: string;
  publicName: string;
  role: string;
  cashCredits: string;
  promoCredits: string;
  hasDeposited: boolean;
};

const STORAGE_KEY = "chapacash_me";
let cachedMe: Me | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readStored(): Me | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Me;
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(next: Me | null) {
  if (typeof window === "undefined") return;
  try {
    if (!next) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

export type CachedMe = Me;

export function getCachedSession(): Me | null {
  return cachedMe;
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hydrateSessionFromStorage() {
  if (cachedMe) return cachedMe;
  const stored = readStored();
  if (stored) {
    cachedMe = stored;
    emit();
  }
  return cachedMe;
}

export function setCachedSession(next: Me | null) {
  cachedMe = next;
  writeStored(next);
  emit();
}

export function patchCachedBalances(partial: {
  cashCredits?: string;
  promoCredits?: string;
  hasDeposited?: boolean;
}) {
  if (!cachedMe) return;
  if (partial.cashCredits == null && partial.promoCredits == null && partial.hasDeposited == null) return;
  cachedMe = {
    ...cachedMe,
    cashCredits: partial.cashCredits ?? cachedMe.cashCredits,
    promoCredits: partial.promoCredits ?? cachedMe.promoCredits,
    hasDeposited: partial.hasDeposited ?? cachedMe.hasDeposited,
  };
  writeStored(cachedMe);
  emit();
}

export function clearCachedSession() {
  cachedMe = null;
  writeStored(null);
  emit();
}

export function useCachedSession() {
  return useSyncExternalStore(subscribeSession, getCachedSession, () => null);
}
