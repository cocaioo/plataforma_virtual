def validate_cpf(cpf: str) -> bool:
    cpf = ''.join(filter(str.isdigit, cpf))
    
    if len(cpf) != 11:
        return False
    
    if cpf == cpf[0] * 11:
        return False
    
    def calcular_digito(cpf_parcial: str, peso_inicial: int) -> int:
        total = sum(
            int(digito) * peso
            for digito, peso in zip(cpf_parcial, range(peso_inicial, 1, -1))
        )
        resto = total % 11
        return 0 if resto < 2 else 11 - resto
    
    primeiro_digito = calcular_digito(cpf[:9], 10)
    if primeiro_digito != int(cpf[9]):
        return False
    
    segundo_digito = calcular_digito(cpf[:10], 11)
    if segundo_digito != int(cpf[10]):
        return False
    
    return True
