import Stripe from 'stripe';

export function publicUrl(fallback = 'http://localhost:3000') {
  return (process.env.PUBLIC_URL || fallback).replace(/\/$/, '');
}

export function smtpConfig() {
  return { host: process.env.SMTP_HOST || '', port: Number.parseInt(process.env.SMTP_PORT || '587', 10), secure: process.env.SMTP_SECURE === 'true', requireTLS: process.env.SMTP_REQUIRE_TLS ? process.env.SMTP_REQUIRE_TLS === 'true' : process.env.NODE_ENV === 'production', user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '', from: process.env.SMTP_FROM || 'MindLarp <no-reply@mindlarp.ai>' };
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!globalThis.__mindLarpStripe) globalThis.__mindLarpStripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return globalThis.__mindLarpStripe;
}

export function billingConfigured() {
  return Boolean(getStripe() && process.env.STRIPE_PRICE_ID);
}
