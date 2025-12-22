const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Utilidades de autenticação: token JWT e usuário atual
function getToken() {
  return localStorage.getItem("access_token");
}

function setToken(token) {
  localStorage.setItem("access_token", token);
}

function removeToken() {
  localStorage.removeItem("access_token");
}

function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem("current_user");
    return;
  }
  localStorage.setItem("current_user", JSON.stringify(user));
}

function getCurrentUser() {
  const raw = localStorage.getItem("current_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearAuth() {
  removeToken();
  localStorage.removeItem("current_user");
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
      clearAuth();
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
     if (data.user) {
       // Papel básico definido exclusivamente pelo backend
       const role = data.user.is_profissional ? "profissional" : "usuario";
       setCurrentUser({ ...data.user, role });
     }
    return data;
  },
  
  signUp: (payload) => request("/auth/register", { method: "POST", body: payload }),
  
  logout: () => {
    clearAuth();
    window.location.href = "/";
  },
  
  getToken,
  setToken,
  removeToken,
  getCurrentUser,
  setCurrentUser,
};
