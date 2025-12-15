const sqlPattern = /(union|select|insert|update|delete|drop|;|--|\/\*|\*\/|xp_)/i;
const xssPattern = /(<script|<iframe|javascript:|onerror=|onload=)/i;

export function hasSqlRisk(text = "") {
  return sqlPattern.test(text);
}

export function hasXssRisk(text = "") {
  return xssPattern.test(text);
}

export function validateCPF(cpf) {
  cpf = cpf.replace(/\D/g, "");

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (cpfPartial, weightStart) => {
    const total = cpfPartial
      .split('')
      .reduce((sum, digit, index) => sum + parseInt(digit) * (weightStart - index), 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calculateDigit(cpf.substring(0, 9), 10);
  if (firstDigit !== parseInt(cpf[9])) return false;

  const secondDigit = calculateDigit(cpf.substring(0, 10), 11);
  if (secondDigit !== parseInt(cpf[10])) return false;

  return true;
}

export function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push("Mínimo 8 caracteres");
  if (!/[A-Z]/.test(password)) errors.push("Uma letra maiúscula");
  if (!/[a-z]/.test(password)) errors.push("Uma letra minúscula");
  if (!/\d/.test(password)) errors.push("Um número");
  return errors;
}

export function validateRegister(form) {
  const errors = {};
  
  if (!form.nome || form.nome.trim().length < 2) {
    errors.nome = "Nome deve ter no mínimo 2 caracteres.";
  } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(form.nome)) {
    errors.nome = "Nome deve conter apenas letras.";
  }
  
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Email inválido.";
  }
  
  if (!form.cpf || !validateCPF(form.cpf)) {
    errors.cpf = "CPF inválido.";
  }
  
  const passwordErrors = validatePassword(form.senha);
  if (passwordErrors.length > 0) {
    errors.senha = `Senha deve ter: ${passwordErrors.join(", ")}.`;
  }
  
  if (form.senha !== form.confirmarSenha) {
    errors.confirmarSenha = "Senhas não conferem.";
  }

  const risky = [form.nome, form.email].some(field => hasSqlRisk(field) || hasXssRisk(field));
  if (risky) {
    errors.segurança = "Entrada contém padrão suspeito.";
  }

  return errors;
}
