import { useEffect, useState } from 'react';
import { WEBINAR } from './config.js';
import { sendOtp, verifyOtp, register } from './api.js';
import OtpInput from './OtpInput.jsx';

const emptyForm = { name: '', email: '', phone: '', city: '' };

export default function App() {
  const [step, setStep] = useState('details'); // details | otp | done
  const [form, setForm] = useState(emptyForm);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const run = async (fn) => {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onDetails = (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(form.phone)) return setError('Enter your 10-digit WhatsApp number.');
    run(async () => {
      await sendOtp(form.phone);
      setOtp('');
      setWait(30);
      setStep('otp');
    });
  };

  const onVerify = (e) => {
    e.preventDefault();
    if (otp.length !== 6) return setError('Enter all 6 digits of the OTP.');
    run(async () => {
      const { verifiedToken } = await verifyOtp(form.phone, otp);
      await register({ ...form, verifiedToken });
      setStep('done');
    });
  };

  const resend = () =>
    run(async () => {
      await sendOtp(form.phone);
      setOtp('');
      setWait(30);
    });

  return (
    <>
      <header className="top">
        <span className="brand">{WEBINAR.brand}</span>
      </header>

      <main className="page">
        <section className="info">
          <p className="badge">{WEBINAR.price} live webinar</p>
          <h1>{WEBINAR.title}</h1>

          <dl className="facts">
            <div><dt>Date</dt><dd>{WEBINAR.date}</dd></div>
            <div><dt>Time</dt><dd>{WEBINAR.time}</dd></div>
            <div><dt>Where</dt><dd>{WEBINAR.mode}</dd></div>
          </dl>

          <h2>What you will learn</h2>
          <ul className="learn">
            {WEBINAR.learn.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </section>

        <section className="card" aria-live="polite">
          {step === 'details' && (
            <form onSubmit={onDetails} noValidate>
              <h2>Reserve your seat</h2>
              <label>Full name
                <input required value={form.name} onChange={set('name')} autoComplete="name" />
              </label>
              <label>Email
                <input required type="email" value={form.email} onChange={set('email')} autoComplete="email" />
              </label>
              <label>WhatsApp number
                <span className="phone">
                  <span className="cc">+91</span>
                  <input
                    required
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                    autoComplete="tel-national"
                  />
                </span>
              </label>
              <label>City (optional)
                <input value={form.city} onChange={set('city')} autoComplete="address-level2" />
              </label>
              {error && <p className="error" role="alert">{error}</p>}
              <button className="btn" disabled={busy || !form.name || !form.email}>
                {busy ? 'Sending OTP…' : 'Send OTP on WhatsApp'}
              </button>
              <p className="hint">We verify your number with a one-time code. No spam.</p>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={onVerify}>
              <h2>Enter the OTP</h2>
              <p className="hint">
                We sent a 6-digit code on WhatsApp to +91 {form.phone}.{' '}
                <button type="button" className="link" onClick={() => { setStep('details'); setError(''); }}>
                  Change number
                </button>
              </p>
              <OtpInput value={otp} onChange={setOtp} disabled={busy} />
              {error && <p className="error" role="alert">{error}</p>}
              <button className="btn" disabled={busy || otp.length !== 6}>
                {busy ? 'Verifying…' : 'Verify and register'}
              </button>
              <p className="hint">
                {wait > 0 ? (
                  `Resend OTP in ${wait}s`
                ) : (
                  <button type="button" className="link" onClick={resend} disabled={busy}>Resend OTP</button>
                )}
              </p>
            </form>
          )}

          {step === 'done' && (
            <div className="done">
              <div className="tick" aria-hidden="true">✓</div>
              <h2>You are registered, {form.name.split(' ')[0]}</h2>
              <p>
                {WEBINAR.date} at {WEBINAR.time}. We will send the joining link on WhatsApp to +91 {form.phone}.
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
