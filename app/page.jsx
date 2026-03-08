"use client"
import { useState, useEffect } from "react";
import Link from "next/link";

const PHASES = [
  {
    id: 1,
    slug: "javascript-1",
    route: "/phase/javascript-1",
    label: "Phase 01",
    title: "JavaScript Foundations",
    subtitle: "The WHY layer — closures, event loop, prototypes, async",
    color: "#f7df1e",
    tag: "JS · Core",
    concepts: 10,
    topics: ["Execution Context", "Closures", "Event Loop", "Promises", "Prototypes", "this keyword", "HOF", "Destructuring"],
    status: "active",
  },
  {
    id: 2,
    slug: "typescript-2",
    route: "/phase/typescript-2",
    label: "Phase 02",
    title: "TypeScript",
    subtitle: "Type thinking — generics, utility types, mapped types, inference",
    color: "#3178c6",
    tag: "TS · Types",
    concepts: 10,
    topics: ["Generics", "Utility Types", "Type Guards", "Mapped Types", "Conditional Types", "Declaration Files", "keyof / typeof", "Template Literals"],
    status: "active",
  },
  {
    id: 3,
    slug: "backend-core-3",
    route: "/phase/backend-core-3",
    label: "Phase 03",
    title: "Backend Architecture",
    subtitle: "Scalable Node — layered arch, SOLID, caching, queues, auth",
    color: "#00e5cc",
    tag: "Node · Architecture",
    concepts: 10,
    topics: ["Layered Architecture", "SOLID", "Dependency Injection", "Redis Caching", "Message Queues", "DB Indexing", "REST Design", "Error Handling"],
    status: "active",
  },
  {
    id: 4,
    slug: "networking-aand-security-4",
    route: "/phase/networking-aand-security-4",
    label: "Phase 04",
    title: "Networking & Security",
    subtitle: "How the internet works — and how it gets broken",
    color: "#ff5252",
    tag: "Net · Security",
    concepts: 8,
    topics: ["OSI / TCP/IP", "HTTP Deep Dive", "TLS & HTTPS", "JWT & Auth", "OWASP Top 10", "Rate Limiting", "Nginx & Infra", "TryHackMe Path"],
    status: "active",
  },
  {
    id: 5,
    slug: "dsa-pro-5",
    route: "/phase/dsa-pro-5",
    label: "Phase 05",
    title: "DSA — Pro",
    subtitle: "Think in complexity — arrays, trees, graphs, DP, real systems",
    color: "#ab47bc",
    tag: "DSA · Algorithms",
    concepts: 10,
    topics: ["Big O", "Arrays & HashMaps", "Linked Lists", "Binary Search", "Trees & BST", "Recursion & DP", "Graphs", "Heaps", "Sorting", "Systems"],
    status: "active",
  },
];

const BG             = "#04080f";
const PANEL          = "#070d1a";
const BORDER         = "#0d1828";
const ACCENT         = "#00e5cc";
const TEXT_PRIMARY   = "#e2eaf4";
const TEXT_SECONDARY = "#6a8aaa";
const TEXT_MUTED     = "#2e4a64";

function Pill({ text, color }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 3,
      background: color + "18", border: "1px solid " + color + "40",
      fontSize: "7px", letterSpacing: "2px", color, textTransform: "uppercase", fontWeight: 700,
    }}>{text}</span>
  );
}

function Counter({ to, duration = 1200 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(pct * to));
      if (pct < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [to, duration]);
  return <>{val}</>;
}

export default function HomePage() {
  const [hovered, setHovered] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  const totalConcepts = PHASES.reduce((s, p) => s + p.concepts, 0);

  return (
    <div style={{
      minHeight: "100vh", background: BG, color: TEXT_PRIMARY,
      fontFamily: "'JetBrains Mono', monospace", overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Bebas+Neue&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #0e1628; border-radius: 2px; }
        a { text-decoration: none; color: inherit; }

        .phase-card { transition: border-color .2s, transform .2s, box-shadow .2s; cursor: pointer; }
        .phase-card:hover { transform: translateY(-2px); }
        .topic-chip { transition: background .15s, color .15s; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { opacity: 0; animation: fadeUp .5s ease forwards; }

        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .scanline {
          position: fixed; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(transparent, #00e5cc08, transparent);
          pointer-events: none; z-index: 0;
          animation: scanline 6s linear infinite;
        }

        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .cursor { animation: blink 1.1s step-end infinite; }
      `}</style>

      <div className="scanline" />

      {/* NAV */}
      <nav style={{
        height: 52, borderBottom: "1px solid " + BORDER, background: PANEL,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 28px", position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: ACCENT + "14", border: "1px solid " + ACCENT + "30",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ width: 10, height: 10, background: ACCENT, borderRadius: 2 }} />
          </div>
          <div>
            <div style={{ fontSize: "7px", letterSpacing: "3px", color: TEXT_MUTED, textTransform: "uppercase" }}>
              Dev Roadmap
            </div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 15, color: TEXT_PRIMARY, letterSpacing: 1 }}>
              Full Stack · Engineer Plan
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ fontSize: "8px", letterSpacing: "1.5px", color: TEXT_MUTED }}>
            {PHASES.length} PHASES
          </div>
          <div style={{ width: 1, height: 18, background: BORDER }} />
          <div style={{ fontSize: "8px", letterSpacing: "1.5px", color: TEXT_MUTED }}>
            {totalConcepts} CONCEPTS
          </div>
          <div style={{ width: 1, height: 18, background: BORDER }} />
          <div style={{
            padding: "4px 12px", borderRadius: 4,
            background: ACCENT + "0a", border: "1px solid " + ACCENT + "22",
            fontSize: "8px", letterSpacing: "2px", color: ACCENT,
          }}>IN PROGRESS</div>
        </div>
      </nav>

      {/* HERO */}
      <div style={{
        padding: "64px 28px 48px", borderBottom: "1px solid " + BORDER,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, opacity: 0.025,
          backgroundImage: `linear-gradient(#00e5cc 1px, transparent 1px), linear-gradient(90deg, #00e5cc 1px, transparent 1px)`,
          backgroundSize: "40px 40px", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", right: -20, top: "50%", transform: "translateY(-50%)",
          fontFamily: "'Bebas Neue'", fontSize: "clamp(80px, 14vw, 180px)",
          color: ACCENT, opacity: 0.025, letterSpacing: 8,
          pointerEvents: "none", userSelect: "none",
        }}>ROADMAP</div>

        <div style={{ position: "relative", maxWidth: 720 }}>
          <div className="fade-up" style={{ animationDelay: "0ms" }}>
            <Pill text="Personal Learning OS" color={ACCENT} />
          </div>

          <h1 className="fade-up" style={{
            animationDelay: "80ms",
            fontFamily: "'Bebas Neue'", fontSize: "clamp(36px, 6vw, 72px)",
            color: TEXT_PRIMARY, letterSpacing: "1.5px", lineHeight: 1.1,
            marginTop: 16, marginBottom: 16,
          }}>
            From Developer<br />
            <span style={{ color: ACCENT }}>To Engineer.</span>
          </h1>

          <p className="fade-up" style={{
            animationDelay: "160ms",
            fontSize: "11.5px", color: TEXT_SECONDARY, lineHeight: 2, maxWidth: 520,
          }}>
            5 phases. {totalConcepts} deep-dived concepts. Built for the 2-year window.
            <br />
            Every concept has the WHY, the internals, the real code, the bugs, and the challenge.
            <br />
            Not a course. Not tutorials. A structured path to thinking like an engineer.
          </p>

          <div className="fade-up" style={{
            animationDelay: "240ms", display: "flex", gap: 32, marginTop: 32, flexWrap: "wrap",
          }}>
            {[
              { val: PHASES.length, label: "Phases"     },
              { val: totalConcepts, label: "Concepts"   },
              { val: 48,            label: "Challenges" },
              { val: 2,             label: "Years"      },
            ].map(({ val, label }) => (
              <div key={label}>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 40, color: TEXT_PRIMARY, letterSpacing: 1, lineHeight: 1 }}>
                  {mounted ? <Counter to={val} /> : 0}
                </div>
                <div style={{ fontSize: "8px", letterSpacing: "2px", color: TEXT_MUTED, textTransform: "uppercase", marginTop: 6 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PHASES GRID */}
      <div style={{ padding: "40px 28px 60px" }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "baseline", marginBottom: 28, gap: 12, flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: "7px", letterSpacing: "3px", color: TEXT_MUTED, textTransform: "uppercase", marginBottom: 6 }}>
              Learning Path
            </div>
            <div style={{ fontFamily: "'Bebas Neue'", fontSize: 24, color: TEXT_PRIMARY, letterSpacing: 1 }}>
              All Phases
            </div>
          </div>
          <div style={{ fontSize: "9px", color: TEXT_SECONDARY, letterSpacing: "1px" }}>
            Click any phase to open →
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 16,
          alignItems: "stretch",       /* every cell same height */
        }}>
          {PHASES.map((phase, i) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              index={i}
              hovered={hovered === phase.id}
              onHover={() => setHovered(phase.id)}
              onLeave={() => setHovered(null)}
            />
          ))}
        </div>
      </div>

      {/* HOW TO USE */}
      <div style={{ borderTop: "1px solid " + BORDER, padding: "40px 28px", background: PANEL }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ fontSize: "7px", letterSpacing: "3px", color: TEXT_MUTED, textTransform: "uppercase", marginBottom: 6 }}>
            Protocol
          </div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: 22, color: TEXT_PRIMARY, letterSpacing: 1, marginBottom: 28 }}>
            How to Use This
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { step: "01", title: "One concept per session", body: "Don't rush. Go through all 6 tabs in order. WHY first, always." },
              { step: "02", title: "Write the challenge",     body: "Only mark done after you've written the challenge code yourself. Reading ≠ knowing." },
              { step: "03", title: "Do them in order",        body: "Each phase builds on the last. JS → TS → Backend → Networking → DSA." },
              { step: "04", title: "One concept daily",       body: "Consistent > intense. One concept a day compounds to everything in 48 days." },
            ].map(({ step, title, body }) => (
              <div key={step} style={{
                padding: "18px 20px", background: BG,
                border: "1px solid " + BORDER, borderRadius: 10,
              }}>
                <div style={{
                  fontFamily: "'Bebas Neue'", fontSize: 28,
                  color: ACCENT, opacity: 0.3, letterSpacing: 1, lineHeight: 1, marginBottom: 8,
                }}>{step}</div>
                <div style={{ fontSize: "10.5px", color: TEXT_PRIMARY, marginBottom: 6, fontWeight: 500 }}>{title}</div>
                <div style={{ fontSize: "10px", color: TEXT_SECONDARY, lineHeight: 1.8 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        borderTop: "1px solid " + BORDER, padding: "20px 28px",
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ fontSize: "9px", color: TEXT_MUTED, letterSpacing: "1.5px" }}>
          The gap is exactly what this is for.
        </div>
        <div style={{ fontSize: "9px", color: TEXT_MUTED, letterSpacing: "1.5px", display: "flex", alignItems: "center", gap: 6 }}>
          <span className="cursor" style={{ color: ACCENT }}>▋</span>
          KEEP BUILDING
        </div>
      </div>
    </div>
  );
}

function PhaseCard({ phase, index, hovered, onHover, onLeave }) {
  const { label, title, subtitle, color, tag, concepts, topics, route } = phase;

  return (
    <Link href={route} style={{ display: "block", height: "100%" }}>
      <div
        className="phase-card fade-up"
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        style={{
          animationDelay: index * 70 + "ms",
          background: hovered ? color + "07" : PANEL,
          border: "1px solid " + (hovered ? color + "50" : BORDER),
          borderRadius: 12,
          padding: "22px 22px 18px",
          boxShadow: hovered ? "0 8px 32px " + color + "14" : "none",
          position: "relative",
          overflow: "hidden",
          height: "100%",           /* fill the Link which fills the grid cell */
          display: "flex",
          flexDirection: "column",  /* footer pins to bottom via marginTop auto */
        }}
      >
        {/* top accent line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: hovered ? 0.7 : 0, transition: "opacity .2s",
        }} />

        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: "8px", letterSpacing: "2.5px", color: color, opacity: 0.7, textTransform: "uppercase", fontWeight: 600 }}>
              {label}
            </div>
            <Pill text={tag} color={color} />
          </div>
          <div style={{
            fontFamily: "'Bebas Neue'", fontSize: 42, color: color,
            opacity: hovered ? 0.2 : 0.08, letterSpacing: 2, lineHeight: 1,
            transition: "opacity .2s",
          }}>{String(phase.id).padStart(2, "0")}</div>
        </div>

        {/* title + subtitle */}
        <h2 style={{
          fontFamily: "'Bebas Neue'", fontSize: "clamp(20px, 2.2vw, 26px)",
          color: TEXT_PRIMARY, letterSpacing: "0.5px", lineHeight: 1.15, marginBottom: 6,
        }}>{title}</h2>
        <p style={{ fontSize: "10.5px", color: TEXT_SECONDARY, lineHeight: 1.7, marginBottom: 18 }}>
          {subtitle}
        </p>

        {/* topic chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
          {topics.slice(0, 6).map(t => (
            <span key={t} className="topic-chip" style={{
              padding: "3px 8px", borderRadius: 3,
              background: hovered ? color + "12" : "#0a1020",
              border: "1px solid " + (hovered ? color + "28" : BORDER),
              fontSize: "8.5px",
              color: hovered ? color : TEXT_MUTED,
              letterSpacing: "0.5px", transition: "all .2s",
            }}>{t}</span>
          ))}
          {topics.length > 6 && (
            <span style={{
              padding: "3px 8px", borderRadius: 3,
              background: "#0a1020", border: "1px solid " + BORDER,
              fontSize: "8.5px", color: TEXT_MUTED,
            }}>+{topics.length - 6} more</span>
          )}
        </div>

        {/* footer — marginTop auto pushes it to the bottom */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          paddingTop: 14, borderTop: "1px solid " + BORDER,
          marginTop: "auto",
        }}>
          <div style={{ fontSize: "9px", color: TEXT_MUTED, letterSpacing: "1px" }}>
            <span style={{ color: color, fontWeight: 600, opacity: 0.9 }}>{concepts}</span> concepts
          </div>
          <div style={{
            fontSize: "8px", letterSpacing: "1.5px",
            color: hovered ? color : TEXT_MUTED,
            textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6,
            transition: "color .2s",
          }}>
            Open Phase
            <span style={{
              display: "inline-block",
              transform: hovered ? "translateX(4px)" : "translateX(0)",
              transition: "transform .2s",
            }}>→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}