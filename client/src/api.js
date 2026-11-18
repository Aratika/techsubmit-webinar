const BASE = import.meta.env.VITE_API_URL || '';

async function post(path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export const sendOtp = (phone) => post('/otp/send', { phone });
export const verifyOtp = (phone, otp) => post('/otp/verify', { phone, otp });
export const register = (payload) => post('/register', payload);
