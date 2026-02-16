import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const WAITLIST_PATH = join(process.cwd(), "waitlist.json");

interface WaitlistEntry {
  email: string;
  timestamp: string;
}

async function readWaitlist(): Promise<WaitlistEntry[]> {
  try {
    const data = await readFile(WAITLIST_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeWaitlist(entries: WaitlistEntry[]): Promise<void> {
  await writeFile(WAITLIST_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 },
      );
    }

    const entries = await readWaitlist();

    const existing = entries.findIndex(function match(e) {
      return e.email === email;
    });

    if (existing !== -1) {
      return NextResponse.json({
        success: true,
        position: existing + 1,
        message: "You're already on the list.",
      });
    }

    entries.push({ email, timestamp: new Date().toISOString() });
    await writeWaitlist(entries);

    return NextResponse.json({
      success: true,
      position: entries.length,
      message: "You're in.",
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}
