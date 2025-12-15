const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("access_token");
}

function setToken(token) {
  localStorage.setItem("access_token", token);
}

function removeToken() {
  localStorage.removeItem("access_token");
}

async function request(path, { method = "GET", body, headers = {}, requiresAuth = false } = {}) {
  const requestHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (requiresAuth) {
    const token = getToken();
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    if (res.status === 401 && requiresAuth) {
      removeToken();
      window.location.href = "/";
    }
    const msg = data.detail || data.message || "Erro ao comunicar com o servidor";
    throw new Error(msg);
  }
  
  return data;
}

export const api = {
  login: async (payload) => {
    const data = await request("/auth/login", { method: "POST", body: payload });
    if (data.access_token) {
      setToken(data.access_token);
    }
    return data;
  },
  
  signUp: (payload) => request("/auth/register", { method: "POST", body: payload }),
  
  logout: () => {
    removeToken();
    window.location.href = "/";
  },
  
  getToken,
  setToken,
  removeToken,
};
