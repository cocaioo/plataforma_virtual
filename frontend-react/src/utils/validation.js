const sqlPattern = /(union|select|insert|update|delete|drop|;|--|\/\*|\*\/|xp_)/i;

export function hasSqlRisk(text = "") {
  return sqlPattern.test(text);
}

export function validateRegister(form) {
  const errors = {};
  if (!form.nome || form.nome.length < 2) errors.nome = "Informe seu nome (>=2).";
  if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Email inválido.";
  if (!form.cpf || form.cpf.replace(/\D/g, "").length < 11) errors.cpf = "CPF inválido.";
  if (!form.senha || form.senha.length < 6) errors.senha = "Senha deve ter 6+ caracteres.";
  if (form.senha !== form.confirmarSenha) errors.confirmarSenha = "Senhas não conferem.";

  const risky = [form.nome, form.email, form.cpf].some(hasSqlRisk);
  if (risky) errors.segurança = "Entrada contém padrão suspeito (possível SQL injection).";

  return errors;
}
