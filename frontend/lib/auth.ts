export function saveSession(token: string, role: string, adminRole?: string | null) {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
  if (adminRole) {
    localStorage.setItem("adminRole", adminRole);
  } else {
    localStorage.removeItem("adminRole");
  }
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("adminRole");
}

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("role");
}

export function getAdminRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminRole");
}

export function isSuperAdmin(): boolean {
  return getAdminRole() === "super_admin";
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("token");
}
