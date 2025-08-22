// js/cpfValidation.js

/**
 * Valida um número de CPF.
 * @param {string} cpf - O número de CPF a ser validado (pode conter pontos e hífens).
 * @returns {boolean} - True se o CPF for válido, False caso contrário.
 */
function isValidCPF(cpf) {
    if (typeof cpf !== "string") return false;

    cpf = cpf.replace(/[^\d]+/g, ''); // Remove caracteres não numéricos

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false; // Verifica se tem 11 dígitos e não é uma sequência de dígitos iguais
    }

    let sum = 0;
    let remainder;

    // Valida o primeiro dígito verificador
    for (let i = 1; i <= 9; i++) {
        sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;

    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;

    sum = 0;
    // Valida o segundo dígito verificador
    for (let i = 1; i <= 10; i++) {
        sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;

    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;

    return true;
}
