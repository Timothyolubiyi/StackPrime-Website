"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitted">("idle");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Wired to Zoho Campaigns once the API integration is built (see project notes).
    setStatus("submitted");
  }

  return (
    <div className="rounded-lg bg-navy p-8 text-white">
      <h3 className="font-serif text-2xl font-semibold">Stay ahead of what&apos;s next</h3>
      <p className="mt-2 text-sm text-white/75">
        Occasional insights on cloud, security, and infrastructure — no spam, unsubscribe anytime.
      </p>
      {status === "submitted" ? (
        <p className="mt-4 text-sm text-gold">Thanks — you&apos;re on the list.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="flex-1 rounded-full border-0 px-4 py-3 text-sm text-ink placeholder:text-muted"
          />
          <button
            type="submit"
            className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-navy hover:bg-gold/90"
          >
            Subscribe
          </button>
        </form>
      )}
    </div>
  );
}
