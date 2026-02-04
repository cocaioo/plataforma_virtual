import { useState, useEffect } from 'react';

// Hook customizado para "atrasar" a atualização de um valor.
// Isso é útil para evitar requisições excessivas à API enquanto o usuário digita.
export function useDebounce(value, delay) {
  // Estado para armazenar o valor "atrasado".
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Configura um timer para atualizar o estado após o delay especificado.
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Função de limpeza: cancela o timer se o valor mudar antes do fim do delay.
    // Isso garante que apenas o último valor (após a pausa) seja definido.
    return () => {
      clearTimeout(handler);
    };
  }, 
  // O efeito é re-executado se o valor de entrada ou o delay mudarem.
  [value, delay]);

  return debouncedValue;
}
