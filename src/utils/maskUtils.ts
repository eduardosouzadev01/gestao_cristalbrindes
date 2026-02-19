
export const maskPhone = (value: string) => {
    if (!value) return "";
    let val = value.replace(/\D/g, "");
    if (val.length > 11) val = val.slice(0, 11);

    if (val.length > 10) {
        return val.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (val.length > 5) {
        return val.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else if (val.length > 2) {
        return val.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    } else {
        return val;
    }
};

export const maskCpfCnpj = (value: string) => {
    if (!value) return "";
    const cleanValue = value.replace(/\D/g, "");

    if (cleanValue.length <= 11) {
        return cleanValue
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d{1,2})/, "$1-$2")
            .substring(0, 14);
    } else {
        return cleanValue
            .replace(/(\d{2})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1.$2")
            .replace(/(\d{3})(\d)/, "$1/$2")
            .replace(/(\d{4})(\d)/, "$1-$2")
            .substring(0, 18);
    }
};

export const unmask = (value: string) => {
    return value.replace(/\D/g, "");
};

export const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateCpfCnpj = (val: string) => {
    const clean = unmask(val);
    return clean.length === 11 || clean.length === 14;
};
