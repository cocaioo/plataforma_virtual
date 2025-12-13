const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.detail || data.message || "Erro ao comunicar com o servidor";
    throw new Error(msg);
  }
  return data;
}

export const api = {
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  signUp: (payload) => request("/auth/sign-up", { method: "POST", body: payload }),
  // Placeholders for email confirmation flow (need backend endpoints to work):
  requestCode: (email) => request("/auth/request-code", { method: "POST", body: { email } }),
  confirmCode: (email, code) => request("/auth/confirm-code", { method: "POST", body: { email, code } }),
};
