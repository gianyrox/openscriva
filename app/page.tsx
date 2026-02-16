"use client";

import { useState, useEffect, useRef } from "react";
import {
  Brain,
  GitBranch,
  FileText,
  Sparkles,
  Focus,
  Keyboard,
  Users,
  Download,
  Shield,
  Github,
  Star,
  ChevronDown,
  ArrowRight,
  Check,
  Copy,
  Menu,
  X,
} from "lucide-react";

const GITHUB_URL = "https://github.com/gianyrox/openscriva";
const GITHUB_API_URL = "https://api.github.com/repos/gianyrox/openscriva";
const SHARE_TEXT = "I just joined the beta for scriva \u2014 an open-source, AI-native book writing studio. Check it out: https://openscriva.com";

const FAQ_ITEMS = [
  {
    q: "Is scriva free?",
    a: "Yes. scriva is open-source under the MIT license. No pricing, no upsell, no premium tier.",
  },
  {
    q: "Where is my manuscript stored?",
    a: "In your GitHub repo as standard markdown files. You can read, edit, and move them outside of scriva anytime.",
  },
  {
    q: "Do you see my writing or train on it?",
    a: "No. AI requests go directly from your browser to Anthropic using your API key. scriva never sees, stores, or trains on your content.",
  },
  {
    q: "Which AI model does scriva use?",
    a: "Anthropic Claude (Haiku and Sonnet), via your own API key. Bring-your-own-model support is planned.",
  },
  {
    q: "Do I need to know Git?",
    a: "Not deeply. scriva handles branches, commits, and merges through its UI. But if you love Git, you get full access to the repo.",
  },
  {
    q: "How is this different from Scrivener?",
    a: "Scrivener has no AI, no cloud sync, and no collaboration. scriva gives you AI-powered writing, GitHub-based version control, and PR-based collaboration with a modern, distraction-free interface.",
  },
  {
    q: "How is this different from Saru or Cursiv?",
    a: "Those are general-purpose AI writing tools. scriva is purpose-built for books \u2014 with chapter management, character context, voice guides, outline generation, and EPUB/PDF export.",
  },
  {
    q: "Can I export to Kindle or print?",
    a: "Export EPUB for e-readers and print-ready A5 PDF. You can then publish via your preferred platform.",
  },
];

function ScrivalLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 300 100"
      preserveAspectRatio="xMidYMid meet"
      style={{ height: 38, width: "auto" }}
    >
      <svg x="0" y="5" width="80" height="90" viewBox="215 80 180 195">
        <g
          transform="translate(0.000000,400.000000) scale(0.100000,-0.100000)"
          fill="currentColor"
          stroke="none"
        >
          <path d="M3770 3047 c-3 -2 -41 -7 -85 -10 -252 -19 -537 -120 -769 -275 -81 -54 -228 -191 -295 -276 -148 -187 -224 -400 -238 -661 l-6 -120 -69 -139 c-73 -145 -79 -178 -37 -191 30 -10 46 9 99 116 45 89 52 98 96 118 26 13 141 47 256 77 344 89 487 173 592 348 36 61 44 94 26 112 -6 6 12 24 55 53 200 131 380 374 465 629 57 171 50 211 -36 219 -27 3 -51 3 -54 0z m103 -72 c-3 -58 -21 -118 -65 -222 -68 -164 -149 -286 -264 -400 -163 -163 -331 -249 -629 -324 -228 -57 -356 -143 -438 -293 -20 -38 -35 -71 -33 -73 2 -3 17 2 33 10 29 15 144 54 179 61 278 58 461 145 563 266 48 57 51 65 14 47 -42 -22 -125 -39 -189 -39 -51 -1 -55 -2 -39 -14 22 -16 72 -18 130 -4 49 11 55 6 24 -20 -99 -86 -218 -139 -435 -194 -76 -19 -159 -42 -183 -51 -24 -8 -46 -14 -47 -12 -8 7 56 96 96 135 72 69 238 142 375 165 17 3 60 10 96 16 81 13 169 43 226 77 25 14 47 24 49 21 2 -2 -13 -34 -33 -72 -52 -92 -153 -185 -257 -235 -103 -50 -133 -59 -350 -114 -98 -25 -204 -58 -235 -73 -54 -27 -58 -32 -111 -135 -30 -60 -60 -108 -66 -108 -30 0 -19 40 43 163 l67 132 12 150 c8 93 23 188 39 250 93 355 384 657 790 818 200 79 383 116 560 113 l80 -1 -2 -40z" />
          <path d="M3675 2978 c-355 -39 -749 -230 -942 -455 -187 -218 -253 -370 -283 -653 -13 -116 -12 -121 12 -75 19 37 148 235 217 334 17 24 36 63 41 85 31 119 64 233 72 246 20 33 -5 -118 -38 -235 -4 -11 10 -1 32 25 76 89 241 248 344 329 149 119 374 265 520 339 68 35 126 65 129 68 5 5 5 5 -104 -8z m-56 -42 c-2 -2 -65 -41 -139 -86 -212 -128 -401 -273 -568 -435 l-104 -100 7 70 c6 74 -2 102 -29 92 -14 -6 -27 -42 -85 -243 -14 -48 -37 -93 -69 -136 -26 -35 -69 -99 -97 -141 l-50 -77 -3 42 c-4 58 40 226 82 315 71 150 202 305 356 423 133 101 339 198 530 249 97 26 182 39 169 27z" />
          <path d="M3704 2915 c-427 -222 -794 -542 -1082 -941 -39 -54 -36 -67 7 -31 46 38 146 83 251 112 344 95 490 172 656 347 108 114 178 224 240 377 48 118 66 191 48 191 -7 0 -61 -25 -120 -55z m91 -17 c-9 -41 -65 -177 -99 -241 -104 -194 -279 -364 -471 -460 -72 -35 -177 -72 -310 -107 -64 -17 -141 -42 -172 -56 -31 -13 -58 -23 -59 -21 -7 7 76 111 181 228 156 174 247 254 505 444 87 64 399 244 423 245 5 0 5 -15 2 -32z" />
        </g>
      </svg>
      <text
        x="90"
        y="68"
        fill="currentColor"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontSize="55"
        fontWeight="400"
      >
        scriva
      </text>
    </svg>
  );
}

function ScrivaMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="215 80 180 195"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: 24, height: 24 }}
    >
      <g
        transform="translate(0.000000,400.000000) scale(0.100000,-0.100000)"
        fill="currentColor"
        stroke="none"
      >
        <path d="M3770 3047 c-3 -2 -41 -7 -85 -10 -252 -19 -537 -120 -769 -275 -81 -54 -228 -191 -295 -276 -148 -187 -224 -400 -238 -661 l-6 -120 -69 -139 c-73 -145 -79 -178 -37 -191 30 -10 46 9 99 116 45 89 52 98 96 118 26 13 141 47 256 77 344 89 487 173 592 348 36 61 44 94 26 112 -6 6 12 24 55 53 200 131 380 374 465 629 57 171 50 211 -36 219 -27 3 -51 3 -54 0z m103 -72 c-3 -58 -21 -118 -65 -222 -68 -164 -149 -286 -264 -400 -163 -163 -331 -249 -629 -324 -228 -57 -356 -143 -438 -293 -20 -38 -35 -71 -33 -73 2 -3 17 2 33 10 29 15 144 54 179 61 278 58 461 145 563 266 48 57 51 65 14 47 -42 -22 -125 -39 -189 -39 -51 -1 -55 -2 -39 -14 22 -16 72 -18 130 -4 49 11 55 6 24 -20 -99 -86 -218 -139 -435 -194 -76 -19 -159 -42 -183 -51 -24 -8 -46 -14 -47 -12 -8 7 56 96 96 135 72 69 238 142 375 165 17 3 60 10 96 16 81 13 169 43 226 77 25 14 47 24 49 21 2 -2 -13 -34 -33 -72 -52 -92 -153 -185 -257 -235 -103 -50 -133 -59 -350 -114 -98 -25 -204 -58 -235 -73 -54 -27 -58 -32 -111 -135 -30 -60 -60 -108 -66 -108 -30 0 -19 40 43 163 l67 132 12 150 c8 93 23 188 39 250 93 355 384 657 790 818 200 79 383 116 560 113 l80 -1 -2 -40z" />
        <path d="M3675 2978 c-355 -39 -749 -230 -942 -455 -187 -218 -253 -370 -283 -653 -13 -116 -12 -121 12 -75 19 37 148 235 217 334 17 24 36 63 41 85 31 119 64 233 72 246 20 33 -5 -118 -38 -235 -4 -11 10 -1 32 25 76 89 241 248 344 329 149 119 374 265 520 339 68 35 126 65 129 68 5 5 5 5 -104 -8z m-56 -42 c-2 -2 -65 -41 -139 -86 -212 -128 -401 -273 -568 -435 l-104 -100 7 70 c6 74 -2 102 -29 92 -14 -6 -27 -42 -85 -243 -14 -48 -37 -93 -69 -136 -26 -35 -69 -99 -97 -141 l-50 -77 -3 42 c-4 58 40 226 82 315 71 150 202 305 356 423 133 101 339 198 530 249 97 26 182 39 169 27z" />
        <path d="M3704 2915 c-427 -222 -794 -542 -1082 -941 -39 -54 -36 -67 7 -31 46 38 146 83 251 112 344 95 490 172 656 347 108 114 178 224 240 377 48 118 66 191 48 191 -7 0 -61 -25 -120 -55z m91 -17 c-9 -41 -65 -177 -99 -241 -104 -194 -279 -364 -471 -460 -72 -35 -177 -72 -310 -107 -64 -17 -141 -42 -172 -56 -31 -13 -58 -23 -59 -21 -7 7 76 111 181 228 156 174 247 254 505 444 87 64 399 244 423 245 5 0 5 -15 2 -32z" />
      </g>
    </svg>
  );
}

function GitHubStarButton({ stars }: { stars: number | null }) {
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        fontSize: 13,
        fontWeight: 500,
        color: "var(--color-text)",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        padding: "6px 14px",
        textDecoration: "none",
        transition: "border-color 150ms ease, background-color 150ms ease",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={function hoverOn(e) {
        e.currentTarget.style.borderColor = "var(--color-accent)";
        e.currentTarget.style.backgroundColor = "var(--color-surface-hover)";
      }}
      onMouseLeave={function hoverOff(e) {
        e.currentTarget.style.borderColor = "var(--color-border)";
        e.currentTarget.style.backgroundColor = "var(--color-surface)";
      }}
    >
      <Github size={16} />
      <Star size={14} style={{ color: "var(--color-accent)" }} />
      {stars !== null && (
        <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
          {stars >= 1000 ? (stars / 1000).toFixed(1) + "k" : stars}
        </span>
      )}
      {stars === null && (
        <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
          Star
        </span>
      )}
    </a>
  );
}

function HeroImage() {
  return (
    <img
      src="/hero.png"
      alt="scriva editor showing a chapter with AI inline suggestion"
      style={{
        width: "100%",
        maxWidth: 900,
        margin: "0 auto",
        borderRadius: 12,
        display: "block",
        boxShadow: "0 24px 80px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
      }}
    />
  );
}

function FAQItem({ item }: { item: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <button
        type="button"
        onClick={function toggle() {
          setOpen(!open);
        }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 0",
          backgroundColor: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          fontSize: 16,
          fontWeight: 500,
          color: "var(--color-text)",
        }}
      >
        {item.q}
        <ChevronDown
          size={18}
          style={{
            color: "var(--color-text-muted)",
            transition: "transform 200ms ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
            marginLeft: 16,
          }}
        />
      </button>
      <div
        style={{
          maxHeight: open ? 200 : 0,
          overflow: "hidden",
          transition: "max-height 200ms ease, opacity 200ms ease",
          opacity: open ? 1 : 0,
        }}
      >
        <p
          style={{
            padding: "0 0 20px 0",
            margin: 0,
            fontSize: 15,
            lineHeight: 1.6,
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
          }}
        >
          {item.a}
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [copied, setCopied] = useState(false);
  const [stars, setStars] = useState<number | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(function handleScroll() {
    function onScroll() {
      setNavScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return function cleanup() {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(function fetchStars() {
    fetch(GITHUB_API_URL)
      .then(function parseRes(res) {
        return res.json();
      })
      .then(function setCount(data) {
        if (typeof data.stargazers_count === "number") {
          setStars(data.stargazers_count);
        }
      })
      .catch(function ignore() {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || submitting) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Something went wrong.");
        return;
      }

      setSubmitted(true);
      setWaitlistPosition(data.position);
    } catch {
      setSubmitError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText("https://openscriva.com");
    setCopied(true);
    setTimeout(function resetCopy() {
      setCopied(false);
    }, 2000);
  }

  const sectionPadding = "80px 24px";
  const maxWidth = 1080;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
      {/* ===== NAV ===== */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: navScrolled
            ? "color-mix(in srgb, var(--color-bg) 85%, transparent)"
            : "transparent",
          backdropFilter: navScrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: navScrolled ? "blur(12px)" : "none",
          borderBottom: navScrolled
            ? "1px solid var(--color-border)"
            : "1px solid transparent",
          transition: "all 200ms ease",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <a
            href="#top"
            style={{
              color: "var(--color-text)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ScrivalLogo />
          </a>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
            }}
            className="landing-nav-links"
          >
            {[
              { label: "Features", href: "#features" },
              { label: "How it works", href: "#how-it-works" },
              { label: "Open source", href: "#open-source" },
            ].map(function renderLink(link) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: 14,
                    color: "var(--color-text-muted)",
                    textDecoration: "none",
                    transition: "color 150ms ease",
                  }}
                  onMouseEnter={function hoverOn(e) {
                    e.currentTarget.style.color = "var(--color-text)";
                  }}
                  onMouseLeave={function hoverOff(e) {
                    e.currentTarget.style.color = "var(--color-text-muted)";
                  }}
                >
                  {link.label}
                </a>
              );
            })}
            <GitHubStarButton stars={stars} />
            <a
              href="#waitlist"
              style={{
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: "#ffffff",
                backgroundColor: "var(--color-accent)",
                padding: "8px 20px",
                borderRadius: 8,
                textDecoration: "none",
                transition: "background-color 150ms ease",
              }}
              onMouseEnter={function hoverOn(e) {
                e.currentTarget.style.backgroundColor = "var(--color-accent-hover)";
              }}
              onMouseLeave={function hoverOff(e) {
                e.currentTarget.style.backgroundColor = "var(--color-accent)";
              }}
            >
              Join beta
            </a>
          </div>

          <button
            type="button"
            className="landing-mobile-menu-btn"
            onClick={function toggleMenu() {
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            style={{
              display: "none",
              backgroundColor: "transparent",
              border: "none",
              color: "var(--color-text)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            top: 64,
            left: 0,
            right: 0,
            zIndex: 99,
            backgroundColor: "var(--color-bg)",
            borderBottom: "1px solid var(--color-border)",
            padding: "16px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {[
            { label: "Features", href: "#features" },
            { label: "How it works", href: "#how-it-works" },
            { label: "Open source", href: "#open-source" },
          ].map(function renderMobileLink(link) {
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={function closeMenu() {
                  setMobileMenuOpen(false);
                }}
                style={{
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontSize: 16,
                  color: "var(--color-text)",
                  textDecoration: "none",
                }}
              >
                {link.label}
              </a>
            );
          })}
          <GitHubStarButton stars={stars} />
          <a
            href="#waitlist"
            onClick={function closeMenu() {
              setMobileMenuOpen(false);
            }}
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 14,
              fontWeight: 500,
              color: "#ffffff",
              backgroundColor: "var(--color-accent)",
              padding: "10px 20px",
              borderRadius: 8,
              textDecoration: "none",
              textAlign: "center",
            }}
          >
            Join beta
          </a>
        </div>
      )}

      {/* ===== HERO ===== */}
      <section
        id="top"
        style={{
          padding: "160px 24px 80px",
          textAlign: "center",
          maxWidth,
          margin: "0 auto",
        }}
      >
        <h1
          className="landing-hero-h1"
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 64,
            color: "var(--color-accent)",
            margin: "0 0 20px 0",
            lineHeight: 1.1,
            animation: "scriva-fade-in-up 600ms ease both",
          }}
        >
          Write.
        </h1>
        <h2
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontWeight: 400,
            fontSize: 20,
            color: "var(--color-text-muted)",
            margin: "0 auto 32px",
            maxWidth: 600,
            lineHeight: 1.5,
            animation: "scriva-fade-in-up 600ms ease 100ms both",
          }}
        >
          The open-source writing studio where AI knows your book
          {" \u2014 "}not just your words.
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            animation: "scriva-fade-in-up 600ms ease 200ms both",
          }}
        >
          <a
            href="#waitlist"
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 16,
              fontWeight: 500,
              color: "#ffffff",
              backgroundColor: "var(--color-accent)",
              padding: "14px 36px",
              borderRadius: 10,
              textDecoration: "none",
              transition: "background-color 150ms ease",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
            onMouseEnter={function hoverOn(e) {
              e.currentTarget.style.backgroundColor = "var(--color-accent-hover)";
            }}
            onMouseLeave={function hoverOff(e) {
              e.currentTarget.style.backgroundColor = "var(--color-accent)";
            }}
          >
            Join the beta
            <ArrowRight size={18} />
          </a>
          <span
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 13,
              color: "var(--color-text-muted)",
            }}
          >
            Free. Open-source. No credit card.
          </span>
        </div>

        <div
          style={{
            marginTop: 64,
            animation: "scriva-fade-in-up 600ms ease 350ms both",
          }}
        >
          <HeroImage />
        </div>

        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
            flexWrap: "wrap",
            animation: "scriva-fade-in-up 600ms ease 500ms both",
          }}
        >
          {["Markdown-first", "Git-native", "BYO AI key", "MIT licensed"].map(
            function renderChip(label) {
              return (
                <span
                  key={label}
                  style={{
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-surface)",
                  }}
                >
                  {label}
                </span>
              );
            },
          )}
        </div>
      </section>

      {/* ===== PROBLEM / SOLUTION ===== */}
      <section
        style={{
          padding: sectionPadding,
          maxWidth,
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 32,
            fontWeight: 600,
            color: "var(--color-text)",
            textAlign: "center",
            marginBottom: 48,
          }}
        >
          Your manuscript deserves better than this.
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {[
            {
              pain: "Scrivener is powerful but stuck in 2012.",
              detail: "No AI, no cloud, no collaboration.",
              fix: "scriva gives you AI inline editing, GitHub sync, and PR-based reviews.",
            },
            {
              pain: "Google Docs can\u2019t organize 80,000 words.",
              detail: "No structure, no export, no focus mode.",
              fix: "scriva has chapter trees, outline management, and distraction-free focus mode.",
            },
            {
              pain: "AI tools write generic slop.",
              detail: "They don\u2019t know your characters, your voice, or your plot.",
              fix: "scriva\u2019s context system feeds your chapters, characters, and research to Claude \u2014 so suggestions stay on-book.",
            },
          ].map(function renderProblem(item) {
            return (
              <div
                key={item.pain}
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: 28,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div>
                  <p
                    style={{
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--color-text)",
                      margin: "0 0 4px 0",
                    }}
                  >
                    {item.pain}
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      fontSize: 14,
                      color: "var(--color-text-muted)",
                      margin: 0,
                    }}
                  >
                    {item.detail}
                  </p>
                </div>
                <div
                  style={{
                    borderTop: "1px solid var(--color-border)",
                    paddingTop: 16,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      fontSize: 14,
                      color: "var(--color-accent)",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {item.fix}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section
        id="features"
        style={{
          padding: sectionPadding,
          maxWidth,
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 32,
            fontWeight: 600,
            color: "var(--color-text)",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          Everything you need. Nothing you don&apos;t.
        </h2>
        <p
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 16,
            color: "var(--color-text-muted)",
            textAlign: "center",
            marginBottom: 48,
            maxWidth: 520,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Built for long-form writing, from first draft to published book.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
          {[
            {
              icon: Brain,
              title: "Context-Aware AI",
              desc: "Your chapters, characters, research, and voice guide become AI context. Polish prose, continue a scene, generate from outline \u2014 and it all sounds like you.",
            },
            {
              icon: Focus,
              title: "Distraction-Free Editor",
              desc: "Keyboard-first. Focus mode. Split view. Paper and Study themes. Markdown toggle. Just write.",
            },
            {
              icon: GitBranch,
              title: "Git-Native Manuscripts",
              desc: "Your book is markdown files in a GitHub repo. Draft on branches. Review with PRs. Merge conflicts resolved visually.",
            },
            {
              icon: Download,
              title: "Publish-Ready Export",
              desc: "One click to EPUB, print-ready PDF (A5), or a clean markdown bundle. From draft to deliverable.",
            },
          ].map(function renderFeature(item) {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: 28,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Icon size={20} style={{ color: "var(--color-accent)" }} />
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--color-text)",
                    margin: "0 0 8px 0",
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: 14,
                    color: "var(--color-text-muted)",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== DEEP DIVE ===== */}
      <section
        style={{
          padding: sectionPadding,
          maxWidth,
          margin: "0 auto",
        }}
      >
        {[
          {
            heading: "A room of one\u2019s own \u2014 with two themes.",
            copy: "Paper for daylight. Study for late nights. Both designed for hours of comfortable writing.",
            image: "/themes.png",
            alt: "Paper and Study theme comparison",
            reverse: false,
          },
          {
            heading: "Context is everything.",
            copy: "Select what the AI sees. Your character bible, your outline, your research \u2014 all available as context for every suggestion.",
            image: "/context.png",
            alt: "Context-aware AI panel with chapter, character, and outline selection",
            reverse: true,
          },
          {
            heading: "Your voice. Not a generic tone.",
            copy: "Drop in a chapter you love. scriva analyzes your prose style \u2014 tone, pacing, vocabulary \u2014 and teaches the AI to write in it.",
            image: "/voice.png",
            alt: "Voice Guide analysis showing tone, structure, vocabulary, and pacing",
            reverse: false,
          },
          {
            heading: "Branches for experiments. PRs for edits.",
            copy: "Every change is tracked. Draft branches keep main clean. Collaborators review via pull requests. Your revision history is permanent.",
            image: "/pr.png",
            alt: "Pull request review with prose diff and inline comments",
            reverse: true,
          },
          {
            heading: "From manuscript to bookshelf.",
            copy: "Export EPUB for e-readers, print-ready A5 PDF, or a structured markdown bundle. No separate formatting tool needed.",
            image: "/export.png",
            alt: "Export dialog with EPUB, PDF, and Markdown options",
            reverse: false,
          },
        ].map(function renderDeepDive(item, idx) {
          return (
            <div
              key={item.heading}
              style={{
                display: "flex",
                flexDirection: item.reverse ? "row-reverse" : "row",
                alignItems: "center",
                gap: 48,
                marginBottom: idx < 4 ? 80 : 0,
                flexWrap: "wrap",
              }}
              className="landing-deep-dive-row"
            >
              <div style={{ flex: 1, minWidth: 280 }}>
                <h3
                  style={{
                    fontFamily: "var(--font-literata), Georgia, serif",
                    fontSize: 24,
                    fontWeight: 600,
                    color: "var(--color-text)",
                    margin: "0 0 12px 0",
                    lineHeight: 1.3,
                  }}
                >
                  {item.heading}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: 16,
                    color: "var(--color-text-muted)",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {item.copy}
                </p>
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <img
                  src={item.image}
                  alt={item.alt}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    display: "block",
                  }}
                />
              </div>
            </div>
          );
        })}
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section
        id="how-it-works"
        style={{
          padding: sectionPadding,
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 32,
            fontWeight: 600,
            color: "var(--color-text)",
            textAlign: "center",
            marginBottom: 48,
          }}
        >
          How it works
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: 0,
            flexWrap: "wrap",
          }}
          className="landing-steps"
        >
          {[
            {
              num: "1",
              title: "Connect GitHub",
              desc: "Pick a repo (or create one). Your manuscript is markdown files.",
              icon: Github,
            },
            {
              num: "2",
              title: "Write with AI context",
              desc: "Chapters, characters, outline, and notes feed the AI. Suggestions stay on-book.",
              icon: Sparkles,
            },
            {
              num: "3",
              title: "Collaborate & publish",
              desc: "Branch, review, merge. Export EPUB/PDF when ready.",
              icon: Users,
            },
          ].map(function renderStep(step, idx) {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  flex: 1,
                  minWidth: 200,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      backgroundColor: "var(--color-accent)",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      fontSize: 18,
                      fontWeight: 700,
                      marginBottom: 16,
                    }}
                  >
                    {step.num}
                  </div>
                  <Icon
                    size={20}
                    style={{
                      color: "var(--color-accent)",
                      marginBottom: 12,
                    }}
                  />
                  <h3
                    style={{
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--color-text)",
                      margin: "0 0 8px 0",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-inter), system-ui, sans-serif",
                      fontSize: 14,
                      color: "var(--color-text-muted)",
                      margin: 0,
                      lineHeight: 1.5,
                      maxWidth: 220,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
                {idx < 2 && (
                  <div
                    className="landing-step-connector"
                    style={{
                      width: 48,
                      height: 2,
                      backgroundColor: "var(--color-border)",
                      marginTop: 24,
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== OPEN SOURCE / TRUST ===== */}
      <section
        id="open-source"
        style={{
          padding: sectionPadding,
          maxWidth,
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 32,
            fontWeight: 600,
            color: "var(--color-text)",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          Your words, your repo, your rules.
        </h2>
        <p
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 16,
            color: "var(--color-text-muted)",
            textAlign: "center",
            maxWidth: 560,
            margin: "0 auto 48px",
            lineHeight: 1.6,
          }}
        >
          scriva stores your manuscript as standard files in your GitHub repo.
          No proprietary database. No data harvesting. No billing. You own
          everything.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {[
            { icon: Shield, label: "MIT License" },
            { icon: Github, label: "Open-source on GitHub" },
            { icon: FileText, label: "Markdown-first storage" },
            { icon: Keyboard, label: "Bring your own AI key" },
          ].map(function renderBadge(badge) {
            const Icon = badge.icon;
            return (
              <div
                key={badge.label}
                style={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 10,
                  padding: "20px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Icon
                  size={20}
                  style={{ color: "var(--color-accent)", flexShrink: 0 }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-inter), system-ui, sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--color-text)",
                  }}
                >
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
        <p
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 13,
            color: "var(--color-text-muted)",
            textAlign: "center",
            margin: 0,
          }}
        >
          Your AI key stays yours. Requests go directly to Anthropic. We never
          see your writing.
        </p>
      </section>

      {/* ===== EMAIL CAPTURE ===== */}
      <section
        id="waitlist"
        style={{
          padding: sectionPadding,
          maxWidth: 520,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 32,
            fontWeight: 600,
            color: "var(--color-text)",
            marginBottom: 12,
          }}
        >
          Join the beta.
        </h2>
        <p
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontSize: 16,
            color: "var(--color-text-muted)",
            marginBottom: 32,
          }}
        >
          One email when it&apos;s ready. We respect your focus.
        </p>

        {!submitted ? (
          <>
            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                gap: 12,
                maxWidth: 440,
                margin: "0 auto",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <input
                ref={emailRef}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={function handleChange(e) {
                  setEmail(e.target.value);
                }}
                required
                style={{
                  flex: 1,
                  minWidth: 220,
                  padding: "12px 16px",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontSize: 15,
                  color: "var(--color-text)",
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  outline: "none",
                  transition: "border-color 150ms ease",
                }}
                onFocus={function focusOn(e) {
                  e.currentTarget.style.borderColor = "var(--color-accent)";
                }}
                onBlur={function focusOff(e) {
                  e.currentTarget.style.borderColor = "var(--color-border)";
                }}
              />
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "12px 28px",
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontSize: 15,
                  fontWeight: 500,
                  color: "#ffffff",
                  backgroundColor: submitting
                    ? "var(--color-text-muted)"
                    : "var(--color-accent)",
                  border: "none",
                  borderRadius: 8,
                  cursor: submitting ? "not-allowed" : "pointer",
                  transition: "background-color 150ms ease",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onMouseEnter={function hoverOn(e) {
                  if (!submitting) {
                    e.currentTarget.style.backgroundColor = "var(--color-accent-hover)";
                  }
                }}
                onMouseLeave={function hoverOff(e) {
                  if (!submitting) {
                    e.currentTarget.style.backgroundColor = "var(--color-accent)";
                  }
                }}
              >
                {submitting ? "Joining..." : "Join"}
                {!submitting && <ArrowRight size={16} />}
              </button>
            </form>
            {submitError && (
              <p
                style={{
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontSize: 13,
                  color: "var(--color-error)",
                  marginTop: 12,
                }}
              >
                {submitError}
              </p>
            )}
          </>
        ) : (
          <div
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: 32,
              maxWidth: 440,
              margin: "0 auto",
              animation: "scriva-fade-in 200ms ease",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                backgroundColor: "var(--color-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Check size={24} style={{ color: "#ffffff" }} />
            </div>
            <p
              style={{
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                fontSize: 18,
                fontWeight: 600,
                color: "var(--color-text)",
                margin: "0 0 4px 0",
              }}
            >
              You&apos;re in.
            </p>
            <p
              style={{
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                fontSize: 14,
                color: "var(--color-text-muted)",
                margin: "0 0 24px 0",
              }}
            >
              Position #{waitlistPosition} on the list.
            </p>
            <p
              style={{
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: "var(--color-text)",
                margin: "0 0 12px 0",
              }}
            >
              Tell a writer friend:
            </p>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <a
                href={
                  "https://twitter.com/intent/tweet?text=" +
                  encodeURIComponent(SHARE_TEXT)
                }
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontSize: 13,
                  color: "var(--color-text)",
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  padding: "8px 16px",
                  textDecoration: "none",
                  transition: "border-color 150ms ease",
                }}
                onMouseEnter={function hoverOn(e) {
                  e.currentTarget.style.borderColor = "var(--color-accent)";
                }}
                onMouseLeave={function hoverOff(e) {
                  e.currentTarget.style.borderColor = "var(--color-border)";
                }}
              >
                Twitter / X
              </a>
              <a
                href={
                  "https://bsky.app/intent/compose?text=" +
                  encodeURIComponent(SHARE_TEXT)
                }
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontSize: 13,
                  color: "var(--color-text)",
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  padding: "8px 16px",
                  textDecoration: "none",
                  transition: "border-color 150ms ease",
                }}
                onMouseEnter={function hoverOn(e) {
                  e.currentTarget.style.borderColor = "var(--color-accent)";
                }}
                onMouseLeave={function hoverOff(e) {
                  e.currentTarget.style.borderColor = "var(--color-border)";
                }}
              >
                Bluesky
              </a>
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  fontSize: 13,
                  color: "var(--color-text)",
                  backgroundColor: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  padding: "8px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "border-color 150ms ease",
                }}
                onMouseEnter={function hoverOn(e) {
                  e.currentTarget.style.borderColor = "var(--color-accent)";
                }}
                onMouseLeave={function hoverOff(e) {
                  e.currentTarget.style.borderColor = "var(--color-border)";
                }}
              >
                <Copy size={14} />
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 13,
              color: "var(--color-text-muted)",
            }}
          >
            Prefer code over email?
          </span>
          <GitHubStarButton stars={stars} />
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section
        style={{
          padding: sectionPadding,
          maxWidth: 680,
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-literata), Georgia, serif",
            fontSize: 28,
            fontWeight: 600,
            color: "var(--color-text)",
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          Questions
        </h2>
        <div>
          {FAQ_ITEMS.map(function renderFAQ(item) {
            return <FAQItem key={item.q} item={item} />;
          })}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer
        style={{
          padding: "40px 24px",
          maxWidth,
          margin: "0 auto",
          borderTop: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <ScrivaMark />
          <span
            style={{
              fontFamily: "var(--font-literata), Georgia, serif",
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--color-text-muted)",
            }}
          >
            Write.
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <GitHubStarButton stars={stars} />
          <span
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 13,
              color: "var(--color-text-muted)",
            }}
          >
            MIT License
          </span>
          <span
            style={{
              fontFamily: "var(--font-inter), system-ui, sans-serif",
              fontSize: 13,
              color: "var(--color-text-muted)",
            }}
          >
            &copy; 2026 openscriva.com
          </span>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .landing-nav-links {
            display: none !important;
          }
          .landing-mobile-menu-btn {
            display: block !important;
          }
          .landing-deep-dive-row {
            flex-direction: column !important;
          }
          .landing-step-connector {
            display: none !important;
          }
          .landing-steps {
            flex-direction: column !important;
            gap: 32px !important;
          }
          .landing-mockup-sidebar {
            display: none !important;
          }
          .landing-hero-h1 {
            font-size: 48px !important;
          }
        }
      `}</style>
    </div>
  );
}
