export const isValidEmail = (value) => {
  const email = String(value || '').trim();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidCpf = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const calc = (base, factor) => {
    let total = 0;
    for (let i = 0; i < base.length; i += 1) {
      total += Number(base[i]) * (factor - i);
    }
    const rest = total % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const first = calc(digits.slice(0, 9), 10);
  const second = calc(digits.slice(0, 10), 11);
  return first === Number(digits[9]) && second === Number(digits[10]);
};

export const validatePassword = (value) => {
  const senha = String(value || '');
  if (senha.length < 8) return 'Senha deve ter no minimo 8 caracteres.';
  if (!/[A-Z]/.test(senha)) return 'Senha deve conter pelo menos uma letra maiuscula.';
  if (!/[a-z]/.test(senha)) return 'Senha deve conter pelo menos uma letra minuscula.';
  if (!/\d/.test(senha)) return 'Senha deve conter pelo menos um numero.';
  return '';
};

export const validateName = (value) => {
  const nome = String(value || '').trim();
  if (!nome) return 'Informe o nome.';
  if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(nome)) return 'Nome deve conter apenas letras e espacos.';
  return '';
};
