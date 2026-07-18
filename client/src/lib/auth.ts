export type AuthSession = {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
  };
};

const AUTH_STORAGE_KEY = "familypost_auth";

export const getApiBaseUrl = () => {
  const configured = String(import.meta.env.VITE_API_URL ?? "").trim();
  if (!configured) {
    if (typeof window !== "undefined") {
      const { hostname, protocol } = window.location;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return `${protocol}//localhost:3000`;
      }
    }

    return "https://api.foto-post-weltweit.de";
  }
  return configured.replace(/\/$/, "");
};

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  if (!base) {
    return normalizedPath;
  }

  if (normalizedPath === base || normalizedPath.startsWith(`${base}/`)) {
    return normalizedPath;
  }

  return `${base}${normalizedPath}`;
};

export const getAuthSession = (): AuthSession | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

export const setAuthSession = (session: AuthSession) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const getSelectedPlan = () => localStorage.getItem("familypost_selected_plan");

export const setSelectedPlan = (plan: "single" | "family-5" | "benefit-10") => {
  localStorage.setItem("familypost_selected_plan", plan);
};
