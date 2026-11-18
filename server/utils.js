// Accepts "9876543210", "+91 98765 43210", "09876543210" -> "919876543210"
export function normalizePhone(input = '') {
  let digits = String(input).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = '91' + digits;
  return digits.length >= 11 && digits.length <= 15 ? digits : null;
}

export const nowIST = () =>
  new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
