import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmailOtp(email, otp) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Gmail SMTP credentials are missing");
  }

  const result = await transporter.sendMail({
    from: `"Instagram Leads" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your Email Verification OTP",
    html: `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Email Verification</h2>
        <p>Your OTP for registration is:</p>
        <h1 style="letter-spacing: 8px;">${otp}</h1>
        <p>This OTP expires in 5 minutes.</p>
        <p>Please do not share this OTP with anyone.</p>
      </div>
    `,
  });

  console.log("OTP email sent:", result.messageId);

  return result;
}
