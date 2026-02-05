const BASE_API = import.meta.env.PROD
  ? ""
  : import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"; // Added /api as default
console.log("[API] Inicializado com BASE_API:", BASE_API);

// Utilidades de autenticação: token JWT e usuário atual
function getToken() {
  return localStorage.getItem("token"); // Changed to 'token' to match NavBar logic in frontend-react-3
}

function setToken(token) {
  localStorage.setItem("token", token);
}

function removeToken() {
  localStorage.removeItem("token");
}

function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem("user"); // Changed to 'user' to match frontend-react-3
    return;
  }
  localStorage.setItem("user", JSON.stringify(user));
}

function getCurrentUser() {
  const bruto = localStorage.getItem("user");
  if (!bruto) return null;
  try {
    return JSON.parse(bruto);
  } catch {
    return null;
  }
}

function clearAuth() {
  removeToken();
  localStorage.removeItem("user");
}

async function request(path, options = {}) {
  const url = `${BASE_API}${path}`;
  const method = options.method || "GET";

  const fetchOptions = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  if (options.body) {
    fetchOptions.body =
      typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }

  if (options.requiresAuth) {
    const token = getToken();
    if (token) {
      fetchOptions.headers.Authorization = `Bearer ${token.trim()}`;
    }
  }

  console.log(`[API] ↗ ${method} ${url}`);

  try {
    const response = await fetch(url, fetchOptions);
    console.log(`[API] ↙ ${method} ${url} → ${response.status}`);

    if (!response.ok) {
      if (response.status === 401 && options.requiresAuth) {
        clearAuth();
        window.location.href = "/login"; // Redirect to login
      }

      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText };
      }

      throw new Error(
        `HTTP ${response.status}: ${errorData.detail || errorData.error || response.statusText}`
      );
    }

    const data = await response.json().catch(() => ({}));
    return data;
  } catch (error) {
    console.error(`[API ERROR] ${method} ${url}:`, error);
    throw error;
  }
}

export const api = {
  request,
  getToken,
  setToken,
  removeToken,
  getCurrentUser,
  setCurrentUser,
  clearAuth
};
