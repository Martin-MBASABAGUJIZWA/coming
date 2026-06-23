import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { resolveMx } from "dns/promises";

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "tempmail.com", "throwaway.email", "guerrillamail.com",
  "sharklasers.com", "guerrillamailblock.com", "grr.la", "dispostable.com",
  "yopmail.com", "trashmail.com", "fakeinbox.com", "tempail.com",
  "mailnesia.com", "maildrop.cc", "discard.email", "temp-mail.org",
]);

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  return neon(process.env.DATABASE_URL);
}

async function ensureTable() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS subscribers (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      subscribed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

async function verifyEmailDomain(email: string): Promise<{ valid: boolean; code?: string }> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    return { valid: false, code: "FORMAT" };
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, code: "DISPOSABLE" };
  }

  try {
    const records = await resolveMx(domain);
    if (!records || records.length === 0) {
      return { valid: false, code: "NO_DOMAIN" };
    }
    return { valid: true };
  } catch {
    return { valid: false, code: "DOMAIN_NOT_EXIST" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ code: "REQUIRED" }, { status: 400 });
    }

    const trimmed = email.trim().toLowerCase();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return NextResponse.json({ code: "FORMAT" }, { status: 400 });
    }

    const domainCheck = await verifyEmailDomain(trimmed);
    if (!domainCheck.valid) {
      return NextResponse.json({ code: domainCheck.code }, { status: 400 });
    }

    await ensureTable();
    const sql = getDb();

    const existing = await sql`SELECT id FROM subscribers WHERE email = ${trimmed}`;
    if (existing.length > 0) {
      return NextResponse.json({ code: "ALREADY" }, { status: 200 });
    }

    await sql`INSERT INTO subscribers (email) VALUES (${trimmed})`;

    return NextResponse.json({ code: "SUCCESS" }, { status: 201 });
  } catch (err) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ code: "SERVER" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureTable();
    const sql = getDb();
    const rows = await sql`SELECT email, subscribed_at FROM subscribers ORDER BY subscribed_at DESC`;
    return NextResponse.json({ count: rows.length, subscribers: rows });
  } catch (err) {
    console.error("List error:", err);
    return NextResponse.json({ count: 0, subscribers: [] });
  }
}
