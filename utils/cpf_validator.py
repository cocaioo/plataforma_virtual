def validate_cpf(cpf: str) -> bool:
    cpf = ''.join(filter(str.isdigit, cpf))
    
    if len(cpf) != 11:
        return False
    
    if cpf == cpf[0] * 11:
        return False
    
    def calculate_digit(cpf_partial: str, weight_start: int) -> int:
        total = sum(int(digit) * weight for digit, weight in zip(cpf_partial, range(weight_start, 1, -1)))
        remainder = total % 11
        return 0 if remainder < 2 else 11 - remainder
    
    first_digit = calculate_digit(cpf[:9], 10)
    if first_digit != int(cpf[9]):
        return False
    
    second_digit = calculate_digit(cpf[:10], 11)
    if second_digit != int(cpf[10]):
        return False
    
    return True
