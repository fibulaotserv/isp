export function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, '$1.$2.$3-$4').slice(0, 14);
}

export function formatCNPJ(value: string): string {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/g, '$1.$2.$3/$4-$5').slice(0, 18);
}

export const formatDocument = (value: string, type: 'individual' | 'business'): string => {
  const digits = value.replace(/\D/g, '');
  
  if (type === 'individual') {
    // Format CPF: 123.456.789-01
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  } else {
    // Format CNPJ: 12.345.678/0001-90
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  }
};

export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length <= 10) {
    // Format phone: (11) 1234-5678
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  } else {
    // Format cellphone: (11) 91234-5678
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  }
};

export function unformatDocument(value: string): string {
  return value.replace(/\D/g, '');
}

export function unformatPhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatCoordinates(value: number): string {
  return typeof value === 'number' ? value.toFixed(6) : '';
}

export const formatZipCode = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  
  // Format CEP: 12345-678
  return digits
    .replace(/(\d{5})(\d{1,3})$/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};