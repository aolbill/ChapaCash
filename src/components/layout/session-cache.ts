type Me = {
  id: string;
  email: string;
  displayName: string;
  publicName: string;
  role: string;
  cashCredits: string;
  promoCredits: string;
  hasDeposited: boolean;
};

let cachedMe: Me | null = null;

export type CachedMe = Me;

export function getCachedSession(): Me | null {
  return cachedMe;
}

export function setCachedSession(next: Me | null) {
  cachedMe = next;
}

export function clearCachedSession() {
  cachedMe = null;
}
