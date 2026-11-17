import nodemailer from 'nodemailer';

export function createMailer(smtp) {
  if (!smtp.host) return null;
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    requireTLS: smtp.requireTLS,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  });
  return {
    async sendPasswordReset({ email, url }) {
      await transport.sendMail({
        from: smtp.from,
        to: email,
        subject: 'Reset your MindLarp password',
        text: `We received a request to reset your MindLarp password.\n\nOpen this one-time link within 30 minutes:\n${url}\n\nIf you did not request this, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;color:#111;max-width:560px;margin:auto;padding:40px 20px"><h1 style="font-size:24px">Reset your MindLarp password</h1><p>We received a request to reset your password. This one-time link is valid for 30 minutes.</p><p><a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:13px 20px;text-decoration:none">Choose a new password</a></p><p style="color:#666;font-size:12px">If you did not request this, you can ignore this email.</p></div>`,
      });
    },
  };
}
