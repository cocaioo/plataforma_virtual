const BASE_API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
console.log("[API] Inicializado com BASE_API:", BASE_API);

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
  const bruto = localStorage.getItem("current_user");
  if (!bruto) return null;
  try {
    return JSON.parse(bruto);
  } catch {
    return null;
  }
}

function clearAuth() {
  removeToken();
  localStorage.removeItem("current_user");
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
        window.location.href = "/";
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
    console.log("[API] ✓ Dados recebidos:", data);
    return data;
  } catch (error) {
    // Erros de rede/CORS costumam aparecer como TypeError: Failed to fetch
    if (error instanceof TypeError && `${error.message}`.toLowerCase().includes("fetch")) {
      console.error("[API ERROR] NetworkError:", error);
      const networkError = new Error("Não foi possível conectar ao servidor");
      networkError.type = "NETWORK_ERROR";
      throw networkError;
    }
    console.error(`[API ERROR] ${method} ${url}:`, error);
    throw error;
  }
}

async function requestBlob(path, options = {}) {
  const url = `${BASE_API}${path}`;
  const method = options.method || "GET";

  const fetchOptions = {
    method,
    headers: {
      ...(options.headers || {}),
    },
  };

  if (options.requiresAuth) {
    const token = getToken();
    if (token) {
      fetchOptions.headers.Authorization = `Bearer ${token.trim()}`;
    }
  }

  console.log(`[API] ↗ ${method} ${url} (blob)`);

  try {
    const response = await fetch(url, fetchOptions);
    console.log(`[API] ↙ ${method} ${url} → ${response.status} (blob)`);

    if (!response.ok) {
      if (response.status === 401 && options.requiresAuth) {
        clearAuth();
        window.location.href = "/";
      }

      let message = response.statusText;
      try {
        const errorData = await response.json();
        message = errorData.detail || errorData.error || message;
      } catch {
        const text = await response.text().catch(() => "");
        if (text) message = text;
      }

      throw new Error(`HTTP ${response.status}: ${message}`);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("content-disposition") || "";
    return { blob, contentDisposition };
  } catch (error) {
    if (error instanceof TypeError && `${error.message}`.toLowerCase().includes("fetch")) {
      console.error("[API ERROR] NetworkError (blob):", error);
      const networkError = new Error("Não foi possível conectar ao servidor");
      networkError.type = "NETWORK_ERROR";
      throw networkError;
    }
    console.error(`[API ERROR] ${method} ${url} (blob):`, error);
    throw error;
  }
}

async function requestFormData(path, options = {}) {
  const url = `${BASE_API}${path}`;
  const method = options.method || "POST";

  const fetchOptions = {
    method,
    headers: {
      ...(options.headers || {}),
    },
    body: options.body, // FormData
  };

  if (options.requiresAuth) {
    const token = getToken();
    if (token) {
      fetchOptions.headers.Authorization = `Bearer ${token.trim()}`;
    }
  }

  console.log(`[API] ↗ ${method} ${url} (form-data)`);

  try {
    const response = await fetch(url, fetchOptions);
    console.log(`[API] ↙ ${method} ${url} → ${response.status} (form-data)`);

    if (!response.ok) {
      if (response.status === 401 && options.requiresAuth) {
        clearAuth();
        window.location.href = "/";
      }

      let message = response.statusText;
      try {
        const errorData = await response.json();
        message = errorData.detail || errorData.error || message;
      } catch {
        const text = await response.text().catch(() => "");
        if (text) message = text;
      }

      throw new Error(`HTTP ${response.status}: ${message}`);
    }

    const data = await response.json().catch(() => ({}));
    console.log("[API] ✓ Dados recebidos (form-data):", data);
    return data;
  } catch (error) {
    if (error instanceof TypeError && `${error.message}`.toLowerCase().includes("fetch")) {
      console.error("[API ERROR] NetworkError (form-data):", error);
      const networkError = new Error("Não foi possível conectar ao servidor");
      networkError.type = "NETWORK_ERROR";
      throw networkError;
    }
    console.error(`[API ERROR] ${method} ${url} (form-data):`, error);
    throw error;
  }
}

function downloadBlob(blob, filename = "download") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  login: async (payload) => {
    const dados = await request("/auth/login", { method: "POST", body: payload });
    if (dados.access_token) {
      setToken(dados.access_token);
    }
    if (dados.user) {
      const roleRaw = `${dados.user.role || ""}`.toLowerCase();
      const papel = roleRaw || (dados.user.is_profissional ? "profissional" : "usuario");
      setCurrentUser({ ...dados.user, role: papel, is_profissional: !!dados.user.is_profissional });
    }
    return dados;
  },
  
  signUp: (payload) => request("/auth/register", { method: "POST", body: payload }),

  createInvite: (payload = { expires_in_days: 7 }) =>
    request("/auth/invites", { method: "POST", body: payload, requiresAuth: true }),

  claimProfessional: async (payload) => {
    const dados = await request("/auth/profissional/claim", {
      method: "POST",
      body: payload,
      requiresAuth: true,
    });
    if (dados.access_token) {
      setToken(dados.access_token);
    }
    if (dados.user) {
      const roleRaw = `${dados.user.role || ""}`.toLowerCase();
      const papel = roleRaw || (dados.user.is_profissional ? "profissional" : "usuario");
      setCurrentUser({ ...dados.user, role: papel, is_profissional: !!dados.user.is_profissional });
    }
    return dados;
  },

  me: async () => {
    const user = await request("/auth/me", { requiresAuth: true });
    if (user) {
      const roleRaw = `${user.role || ""}`.toLowerCase();
      const papel = roleRaw || (user.is_profissional ? "profissional" : "usuario");
      setCurrentUser({ ...user, role: papel, is_profissional: !!user.is_profissional });
    }
    return user;
  },

  // Solicitação de acesso profissional
  createProfessionalRequest: (payload) =>
    request("/auth/professional-requests", { method: "POST", body: payload, requiresAuth: true }),
  getMyProfessionalRequest: () => request("/auth/professional-requests/me", { requiresAuth: true }),

  // Gestor: listar/aprovar/rejeitar
  listProfessionalRequests: ({ status } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set("status_filter", status);
    const query = params.toString();
    return request(`/auth/professional-requests${query ? `?${query}` : ""}`, { requiresAuth: true });
  },
  approveProfessionalRequest: (id) =>
    request(`/auth/professional-requests/${id}/approve`, { method: "POST", requiresAuth: true }),
  rejectProfessionalRequest: (id, payload) =>
    request(`/auth/professional-requests/${id}/reject`, {
      method: "POST",
      body: payload,
      requiresAuth: true,
    }),
  
  logout: () => {
    clearAuth();
    window.location.href = "/";
  },
  
  getToken,
  setToken,
  removeToken,
  getCurrentUser,
  setCurrentUser,

  // Relatórios situacionais (UBS)
  listReports: ({ status } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const query = params.toString();
    return request(`/ubs${query ? `?${query}` : ""}`, { requiresAuth: true });
  },
  deleteReport: (ubsId) => request(`/ubs/${ubsId}`, { method: "DELETE", requiresAuth: true }),
  exportReportPdf: (ubsId) => requestBlob(`/ubs/${ubsId}/export/pdf`, { requiresAuth: true }),

  // Diagnóstico (formulário)
  createUbsDraft: (payload) => request("/ubs", { method: "POST", body: payload, requiresAuth: true }),
  updateUbs: (ubsId, payload) =>
    request(`/ubs/${ubsId}`, { method: "PATCH", body: payload, requiresAuth: true }),
  upsertTerritory: (ubsId, payload) =>
    request(`/ubs/${ubsId}/territory`, { method: "PUT", body: payload, requiresAuth: true }),
  upsertNeeds: (ubsId, payload) =>
    request(`/ubs/${ubsId}/needs`, { method: "PUT", body: payload, requiresAuth: true }),
  submitDiagnosis: (ubsId, payload = { confirm: true }) =>
    request(`/ubs/${ubsId}/submit`, { method: "POST", body: payload, requiresAuth: true }),

  // Anexos
  listAttachments: (ubsId) => request(`/ubs/${ubsId}/attachments`, { requiresAuth: true }),
  uploadAttachments: (ubsId, files = [], { section = "PROBLEMAS", description = "" } = {}) => {
    const form = new FormData();
    for (const f of files) {
      form.append("files", f);
    }
    form.append("section", section);
    if (description) form.append("description", description);
    return requestFormData(`/ubs/${ubsId}/attachments`, {
      method: "POST",
      body: form,
      requiresAuth: true,
    });
  },
  deleteAttachment: (attachmentId) =>
    request(`/ubs/attachments/${attachmentId}`, { method: "DELETE", requiresAuth: true }),
  downloadAttachment: async (attachmentId, filename) => {
    const { blob } = await requestBlob(`/ubs/attachments/${attachmentId}/download`, { requiresAuth: true });
    downloadBlob(blob, filename || `anexo-${attachmentId}`);
  },
};
