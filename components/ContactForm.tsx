"use client";

import { useState } from "react";

// NOTE: This posts to /api/contact, which doesn't exist yet — it's the next
// piece of real backend work. That route should call the Zoho CRM/Forms API
// to store the lead and trigger the notification email, after verifying the
// reCAPTCHA v3 token server-side. See project notes: Zoho is the confirmed
// provider, RECAPTCHA_SITE_KEY / RECAPTCHA_SECRET_KEY are the relevant env
// vars (already documented in the infra .env.example).

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg bg-cream p-8 text-center">
        <h3 className="font-serif text-xl font-semibold text-navy">Message sent</h3>
        <p className="mt-2 text-[#5A4200]">
          Thanks for reaching out — we&apos;ll follow up at the email you provided.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 med:grid-cols-2">
        <Field label="Full name" name="name" type="text" required />
        <Field label="Email" name="email" type="email" required />
      </div>
      <Field label="Company" name="company" type="text" />
      <div>
        <label htmlFor="message" className="block text-med font-medium text-ink">
          How can we help?
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="mt-1 w-full rounded-md border border-gray-200 px-4 py-3 text-med focus:border-blue focus:outline-none"
        />
      </div>

      {status === "error" && (
        <p className="text-med text-red-600">Something went wrong — please try again or email us directly.</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded-full bg-gold px-6 py-3 text-med font-semibold text-navy hover:bg-gold/90 disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  required,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-med font-medium text-ink">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded-md border border-gray-200 px-4 py-3 text-med focus:border-blue focus:outline-none"
      />
    </div>
  );
}
