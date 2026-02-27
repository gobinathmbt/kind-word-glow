<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Secure Gateway E-Sign Platform — Full Design Document v2.0</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

:root {
  --orange: #F97316;
  --orange-d: #C2410C;
  --orange-l: #FFF7ED;
  --orange-m: #FFEDD5;
  --navy: #0F172A;
  --slate: #1E293B;
  --slate2: #334155;
  --muted: #64748B;
  --border: #E2E8F0;
  --bg: #FAFAFA;
  --white: #FFFFFF;
  --green: #16A34A;
  --blue: #2563EB;
  --red: #DC2626;
  --purple: #7C3AED;
  --teal: #0D9488;
  --mono: 'IBM Plex Mono', monospace;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { font-family: 'DM Sans', sans-serif; color: var(--navy); background: var(--bg); font-size: 14px; line-height: 1.8; }

/* ── COVER ─────────────────────────────────────────────────── */
.cover {
  background: var(--navy);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 80px 80px;
  position: relative;
  overflow: hidden;
}
.cover-grid {
  position: absolute; inset: 0;
  background-image: 
    linear-gradient(rgba(249,115,22,0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(249,115,22,0.08) 1px, transparent 1px);
  background-size: 40px 40px;
}
.cover-accent {
  position: absolute; right: -100px; top: -100px;
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%);
  pointer-events: none;
}
.cover-badge {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(249,115,22,0.15); border: 1px solid rgba(249,115,22,0.3);
  color: var(--orange); padding: 6px 16px; border-radius: 100px;
  font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;
  margin-bottom: 32px; width: fit-content;
}
.cover h1 {
  font-family: 'Syne', sans-serif;
  font-size: 64px; font-weight: 800; color: white; line-height: 1.05;
  letter-spacing: -2px; margin-bottom: 24px;
}
.cover h1 span { color: var(--orange); }
.cover-sub { font-size: 18px; color: #94A3B8; margin-bottom: 40px; max-width: 600px; }
.cover-meta {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 1px; background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
  overflow: hidden; max-width: 700px; margin-top: 48px;
}
.meta-cell { padding: 20px 24px; background: rgba(15,23,42,0.8); }
.meta-cell label { font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; display: block; margin-bottom: 6px; }
.meta-cell p { font-size: 13px; color: #E2E8F0; font-weight: 500; }
.cover-version { position: absolute; bottom: 40px; right: 80px; font-family: var(--mono); font-size: 11px; color: #475569; }

/* ── LAYOUT ─────────────────────────────────────────────────── */
.page { max-width: 1200px; margin: 0 auto; padding: 60px 60px; }

/* ── TOC ─────────────────────────────────────────────────── */
.toc-section { background: white; border: 1px solid var(--border); border-radius: 16px; padding: 40px; margin: 40px 0; }
.toc-header { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
.toc-header h2 { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; }
.toc-dot { width: 8px; height: 8px; background: var(--orange); border-radius: 2px; flex-shrink: 0; }
.toc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.toc-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; text-decoration: none; color: var(--slate2); transition: background 0.15s; }
.toc-item:hover { background: var(--orange-l); color: var(--orange-d); }
.toc-num { background: var(--navy); color: white; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; font-family: var(--mono); }
.toc-item .toc-label { font-size: 13px; font-weight: 500; }
.toc-item .toc-tag { margin-left: auto; font-size: 11px; color: var(--muted); font-family: var(--mono); }

/* ── SECTION ─────────────────────────────────────────────────── */
.section { margin: 64px 0; }
.section-head { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid var(--orange); }
.s-num { background: var(--orange); color: white; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 18px; flex-shrink: 0; }
.s-num.dark { background: var(--navy); }
.section-head h2 { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; }
.section-head .s-tag { margin-left: auto; background: var(--navy); color: white; padding: 4px 12px; border-radius: 6px; font-family: var(--mono); font-size: 11px; font-weight: 600; flex-shrink: 0; }

h3 { font-family: 'Syne', sans-serif; font-size: 17px; font-weight: 700; margin: 36px 0 16px; color: var(--navy); display: flex; align-items: center; gap: 10px; }
h3::before { content: ''; width: 4px; height: 18px; background: var(--orange); border-radius: 2px; flex-shrink: 0; }
h4 { font-size: 14px; font-weight: 600; color: var(--slate); margin: 20px 0 10px; }
p { color: var(--slate2); margin: 10px 0; font-size: 13.5px; }

/* ── DIAGRAM CONTAINERS ─────────────────────────────────────── */
.diagram-wrap {
  background: white; border: 1px solid var(--border); border-radius: 16px;
  padding: 32px; margin: 24px 0; overflow-x: auto;
}
.diagram-title {
  font-family: var(--mono); font-size: 11px; font-weight: 600;
  color: var(--muted); text-transform: uppercase; letter-spacing: 1.5px;
  margin-bottom: 20px; display: flex; align-items: center; gap: 8px;
}
.diagram-title::before { content: ''; width: 6px; height: 6px; background: var(--orange); border-radius: 50%; }

/* ── TABLE ─────────────────────────────────────────────────── */
.table-wrap { overflow-x: auto; margin: 16px 0; border-radius: 10px; border: 1px solid var(--border); }
table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
thead tr { background: var(--navy); }
thead th { padding: 12px 16px; text-align: left; font-weight: 600; color: white; font-family: var(--mono); font-size: 11px; letter-spacing: 0.5px; }
tbody tr:nth-child(even) { background: var(--bg); }
tbody tr:hover { background: var(--orange-l); }
tbody td { padding: 11px 16px; border-bottom: 1px solid var(--border); color: var(--slate2); vertical-align: top; }
tbody tr:last-child td { border-bottom: none; }

/* ── BADGES ─────────────────────────────────────────────────── */
.badge { padding: 2px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; font-family: var(--mono); display: inline-block; }
.b-get { background: #DCFCE7; color: #166534; }
.b-post { background: #EFF6FF; color: #1D4ED8; }
.b-put { background: #FFF7ED; color: var(--orange-d); }
.b-del { background: #FEF2F2; color: #991B1B; }
.b-p0 { background: #FEF2F2; color: #991B1B; }
.b-p1 { background: #FFF7ED; color: var(--orange-d); }
.b-green { background: #DCFCE7; color: #166534; }
.b-blue { background: #EFF6FF; color: #1D4ED8; }
.b-orange { background: #FFF7ED; color: var(--orange-d); }

/* ── CODE ─────────────────────────────────────────────────── */
.code { background: var(--navy); color: #E2E8F0; border-radius: 10px; padding: 22px 24px; font-family: var(--mono); font-size: 12px; line-height: 1.8; margin: 16px 0; overflow-x: auto; white-space: pre; }
.ck { color: var(--orange); }
.cv { color: #86EFAC; }
.cs { color: #FCD34D; }
.cc { color: #475569; }
.ct { color: #7DD3FC; }

/* ── CARDS ─────────────────────────────────────────────────── */
.cards { display: grid; gap: 16px; margin: 16px 0; }
.cards.c2 { grid-template-columns: 1fr 1fr; }
.cards.c3 { grid-template-columns: 1fr 1fr 1fr; }
.card { background: white; border: 1px solid var(--border); border-radius: 12px; padding: 20px 22px; }
.card.ob { border-left: 3px solid var(--orange); }
.card h4 { font-size: 13px; font-weight: 700; color: var(--navy); margin: 0 0 10px; }
.card p { font-size: 12.5px; color: var(--muted); margin: 0; }
.card ul { padding-left: 16px; margin: 8px 0; }
.card li { font-size: 12.5px; color: var(--slate2); margin: 4px 0; line-height: 1.5; }
.card .icon { font-size: 24px; margin-bottom: 10px; }

/* ── INFO BOXES ─────────────────────────────────────────────── */
.info { border-radius: 10px; padding: 16px 20px; margin: 16px 0; }
.info.o { background: var(--orange-l); border: 1px solid #FED7AA; }
.info.b { background: #EFF6FF; border: 1px solid #BFDBFE; }
.info.g { background: #F0FDF4; border: 1px solid #BBF7D0; }
.info.w { background: #FFFBEB; border: 1px solid #FDE68A; }
.info.r { background: #FEF2F2; border: 1px solid #FECACA; }
.info h4 { font-size: 12.5px; font-weight: 700; margin-bottom: 8px; }
.info.o h4 { color: var(--orange-d); }
.info.b h4 { color: var(--blue); }
.info.g h4 { color: var(--green); }
.info.r h4 { color: var(--red); }
.info p, .info li { font-size: 12.5px; color: var(--slate2); }
.info ul { padding-left: 16px; }
.info li { margin: 3px 0; }

/* ── STEP LIST ─────────────────────────────────────────────── */
.steps { margin: 16px 0; }
.step { display: flex; gap: 16px; margin: 12px 0; }
.step-n { background: var(--orange); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0; margin-top: 2px; }
.step-body h5 { font-size: 13.5px; font-weight: 700; color: var(--navy); margin-bottom: 3px; }
.step-body p { font-size: 12.5px; color: var(--muted); margin: 0; }

/* ── DIVIDER ─────────────────────────────────────────────────── */
hr { border: none; border-top: 2px solid var(--orange-m); margin: 60px 0; }

/* ── PROPERTY GRID ─────────────────────────────────────────── */
.props { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
.prop { background: white; border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; }
.prop-num { font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--orange); margin-bottom: 4px; }
.prop h5 { font-size: 12.5px; font-weight: 700; color: var(--navy); margin-bottom: 6px; }
.prop p { font-size: 12px; color: var(--muted); margin: 0; }
.prop .prop-req { font-size: 10px; font-family: var(--mono); color: var(--muted); margin-top: 6px; }

/* ── SVG DIAGRAM ─────────────────────────────────────────────── */
svg text { font-family: 'DM Sans', sans-serif; }
.flow-svg { width: 100%; }

/* ── SCHEMA BOX ─────────────────────────────────────────────── */
.schema { background: #0F172A; border-radius: 12px; padding: 24px 28px; margin: 16px 0; overflow-x: auto; }
.schema pre { color: #94A3B8; font-family: var(--mono); font-size: 11.5px; line-height: 1.7; white-space: pre; }
.sk { color: var(--orange); }
.sv { color: #86EFAC; }
.sc { color: #475569; }
.st { color: #7DD3FC; }

/* ── MODULE BANNER ─────────────────────────────────────────── */
.mod-banner {
  background: linear-gradient(90deg, var(--navy), var(--slate));
  color: white; border-radius: 12px; padding: 18px 24px;
  display: flex; align-items: center; gap: 16px; margin-bottom: 24px;
}
.mod-id { background: var(--orange); padding: 5px 14px; border-radius: 6px; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 14px; }
.mod-name { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; }
.mod-desc { margin-left: auto; font-size: 12px; color: #94A3B8; text-align: right; max-width: 300px; }

/* ── FOOTER ─────────────────────────────────────────────────── */
.doc-footer {
  background: var(--navy); color: #475569; text-align: center;
  padding: 40px 40px; margin-top: 80px; font-family: var(--mono); font-size: 12px;
}
.doc-footer span { color: var(--orange); }

/* State machine styles */
.state-node { rx: 6; }
</style>
</head>
<body>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- COVER PAGE -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="cover">
  <div class="cover-grid"></div>
  <div class="cover-accent"></div>
  <div style="position:relative;z-index:1;">
    <div class="cover-badge">🔐 Design Document · v2.0</div>
    <h1>Secure Gateway<br/><span>E-Sign Platform</span></h1>
    <p class="cover-sub">Complete architecture reference — schemas, workflows, module specifications, diagrams, security model, and correctness properties for the MERN-stack e-signature system.</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;">
      <span style="background:rgba(249,115,22,0.15);border:1px solid rgba(249,115,22,0.3);color:var(--orange);padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;">7 Core Modules</span>
      <span style="background:rgba(249,115,22,0.15);border:1px solid rgba(249,115,22,0.3);color:var(--orange);padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;">35 Correctness Properties</span>
      <span style="background:rgba(249,115,22,0.15);border:1px solid rgba(249,115,22,0.3);color:var(--orange);padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;">MERN Stack + Python PDF</span>
      <span style="background:rgba(249,115,22,0.15);border:1px solid rgba(249,115,22,0.3);color:var(--orange);padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;">Security Enhanced</span>
    </div>
    <div class="cover-meta">
      <div class="meta-cell"><label>Stack</label><p>MERN + Python</p></div>
      <div class="meta-cell"><label>Modules</label><p>7 Core + Auth</p></div>
      <div class="meta-cell"><label>Version</label><p>v2.0 — Full</p></div>
      <div class="meta-cell"><label>Status</label><p>Design Phase</p></div>
    </div>
  </div>
  <div class="cover-version">DOC-SGE-2024-v2.0</div>
</div>

<div class="page">

<!-- ══════════════════════════════════════════════════════════ -->
<!-- TABLE OF CONTENTS -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="toc-section">
  <div class="toc-header">
    <div class="toc-dot"></div>
    <h2>Table of Contents</h2>
  </div>
  <div class="toc-grid">
    <a class="toc-item" href="#arch"><div class="toc-num">01</div><span class="toc-label">High-Level Architecture</span><span class="toc-tag">OVERVIEW</span></a>
    <a class="toc-item" href="#m1"><div class="toc-num">02</div><span class="toc-label">Settings Module</span><span class="toc-tag">M1</span></a>
    <a class="toc-item" href="#m2"><div class="toc-num">03</div><span class="toc-label">Template Engine</span><span class="toc-tag">M2</span></a>
    <a class="toc-item" href="#m3"><div class="toc-num">04</div><span class="toc-label">External API — E-Sign Initiation</span><span class="toc-tag">M3</span></a>
    <a class="toc-item" href="#m4"><div class="toc-num">05</div><span class="toc-label">E-Sign Public Page (Signer UX)</span><span class="toc-tag">M4</span></a>
    <a class="toc-item" href="#m5"><div class="toc-num">06</div><span class="toc-label">Document Engine + PDF Pipeline</span><span class="toc-tag">M5</span></a>
    <a class="toc-item" href="#m6"><div class="toc-num">07</div><span class="toc-label">Message Center</span><span class="toc-tag">M6</span></a>
    <a class="toc-item" href="#m7"><div class="toc-num">08</div><span class="toc-label">Audit Log Module</span><span class="toc-tag">M7</span></a>
    <a class="toc-item" href="#security"><div class="toc-num">09</div><span class="toc-label">Security Enhancements</span><span class="toc-tag">SEC</span></a>
    <a class="toc-item" href="#errors"><div class="toc-num">10</div><span class="toc-label">Error Handling</span><span class="toc-tag">ERR</span></a>
    <a class="toc-item" href="#props"><div class="toc-num">11</div><span class="toc-label">Correctness Properties</span><span class="toc-tag">PROPS</span></a>
    <a class="toc-item" href="#testing"><div class="toc-num">12</div><span class="toc-label">Testing Strategy</span><span class="toc-tag">TEST</span></a>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- 01. HIGH-LEVEL ARCHITECTURE -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="section" id="arch">
  <div class="section-head">
    <div class="s-num">01</div>
    <h2>High-Level Architecture</h2>
    <span class="s-tag">SYSTEM OVERVIEW</span>
  </div>

  <p>The Secure Gateway E-Sign Platform is a modular MERN application with three core layers: a React frontend for company users, a Node.js/Express API layer, and MongoDB databases (one master DB + one per company). All post-signature processing is handled asynchronously — PDF generation via a Python microservice, storage via pluggable adapters, and notifications via configurable email/SMS providers.</p>

  <h3>System Architecture Diagram</h3>
  <div class="diagram-wrap">
    <div class="diagram-title">Figure 1 — Full System Architecture</div>
    <svg viewBox="0 0 1000 680" class="flow-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#F97316"/>
        </marker>
        <marker id="arr-gray" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#94A3B8"/>
        </marker>
        <marker id="arr-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#16A34A"/>
        </marker>
        <filter id="shadow" x="-5%" y="-5%" width="110%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.12"/>
        </filter>
      </defs>

      <!-- Zone Labels -->
      <rect x="10" y="10" width="200" height="340" rx="10" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5" stroke-dasharray="6,3"/>
      <text x="110" y="32" text-anchor="middle" fill="#1D4ED8" font-size="10" font-weight="700" letter-spacing="1">REACT FRONTEND</text>

      <rect x="280" y="10" width="260" height="500" rx="10" fill="#FFF7ED" stroke="#FED7AA" stroke-width="1.5" stroke-dasharray="6,3"/>
      <text x="410" y="32" text-anchor="middle" fill="#C2410C" font-size="10" font-weight="700" letter-spacing="1">NODE.JS / EXPRESS BACKEND</text>

      <rect x="610" y="10" width="180" height="340" rx="10" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5" stroke-dasharray="6,3"/>
      <text x="700" y="32" text-anchor="middle" fill="#166534" font-size="10" font-weight="700" letter-spacing="1">EXTERNAL SERVICES</text>

      <rect x="280" y="530" width="510" height="100" rx="10" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1.5" stroke-dasharray="6,3"/>
      <text x="535" y="552" text-anchor="middle" fill="#5B21B6" font-size="10" font-weight="700" letter-spacing="1">DATABASES</text>

      <!-- Frontend boxes -->
      <rect x="25" y="50" width="170" height="36" rx="6" fill="#2563EB" filter="url(#shadow)"/>
      <text x="110" y="72" text-anchor="middle" fill="white" font-size="12" font-weight="600">Dashboard</text>

      <rect x="25" y="100" width="170" height="36" rx="6" fill="#2563EB" filter="url(#shadow)"/>
      <text x="110" y="122" text-anchor="middle" fill="white" font-size="12" font-weight="600">Templates Module</text>

      <rect x="25" y="150" width="170" height="36" rx="6" fill="#2563EB" filter="url(#shadow)"/>
      <text x="110" y="172" text-anchor="middle" fill="white" font-size="12" font-weight="600">Settings Module</text>

      <rect x="25" y="200" width="170" height="36" rx="6" fill="#2563EB" filter="url(#shadow)"/>
      <text x="110" y="222" text-anchor="middle" fill="white" font-size="12" font-weight="600">Message Center</text>

      <rect x="25" y="250" width="170" height="36" rx="6" fill="#1E40AF" filter="url(#shadow)"/>
      <text x="110" y="272" text-anchor="middle" fill="white" font-size="12" font-weight="600">Preview Page</text>

      <rect x="25" y="300" width="170" height="36" rx="6" fill="#1E40AF" filter="url(#shadow)"/>
      <text x="110" y="322" text-anchor="middle" fill="white" font-size="12" font-weight="600">🔓 Signer Page (Public)</text>

      <!-- Backend — API Gateway -->
      <rect x="296" y="50" width="228" height="36" rx="6" fill="#0F172A" filter="url(#shadow)"/>
      <text x="410" y="72" text-anchor="middle" fill="white" font-size="12" font-weight="700">API Gateway / Router</text>

      <!-- Backend Services -->
      <rect x="296" y="110" width="100" height="36" rx="6" fill="#F97316" filter="url(#shadow)"/>
      <text x="346" y="132" text-anchor="middle" fill="white" font-size="11" font-weight="600">Template Svc</text>

      <rect x="424" y="110" width="100" height="36" rx="6" fill="#F97316" filter="url(#shadow)"/>
      <text x="474" y="132" text-anchor="middle" fill="white" font-size="11" font-weight="600">Workflow Svc</text>

      <rect x="296" y="165" width="100" height="36" rx="6" fill="#EA580C" filter="url(#shadow)"/>
      <text x="346" y="187" text-anchor="middle" fill="white" font-size="11" font-weight="600">Notif. Svc</text>

      <rect x="424" y="165" width="100" height="36" rx="6" fill="#EA580C" filter="url(#shadow)"/>
      <text x="474" y="187" text-anchor="middle" fill="white" font-size="11" font-weight="600">Storage Svc</text>

      <rect x="296" y="220" width="100" height="36" rx="6" fill="#C2410C" filter="url(#shadow)"/>
      <text x="346" y="242" text-anchor="middle" fill="white" font-size="11" font-weight="600">Audit Svc</text>

      <rect x="424" y="220" width="100" height="36" rx="6" fill="#C2410C" filter="url(#shadow)"/>
      <text x="474" y="242" text-anchor="middle" fill="white" font-size="11" font-weight="600">PDF Svc</text>

      <rect x="296" y="275" width="100" height="36" rx="6" fill="#9A3412" filter="url(#shadow)"/>
      <text x="346" y="291" text-anchor="middle" fill="white" font-size="11" font-weight="600">OTP / Token</text>
      <text x="346" y="303" text-anchor="middle" fill="white" font-size="11" font-weight="600">Svc</text>

      <rect x="424" y="275" width="100" height="36" rx="6" fill="#9A3412" filter="url(#shadow)"/>
      <text x="474" y="291" text-anchor="middle" fill="white" font-size="11" font-weight="600">API Callback</text>
      <text x="474" y="303" text-anchor="middle" fill="white" font-size="11" font-weight="600">Svc</text>

      <!-- Cron -->
      <rect x="296" y="430" width="228" height="36" rx="6" fill="#374151" filter="url(#shadow)"/>
      <text x="410" y="452" text-anchor="middle" fill="white" font-size="11" font-weight="600">⏰ Expiry Cron Job (15min)</text>

      <!-- External Services -->
      <rect x="626" y="50" width="148" height="32" rx="6" fill="#166534" filter="url(#shadow)"/>
      <text x="700" y="70" text-anchor="middle" fill="white" font-size="11" font-weight="600">Python PDF Microservice</text>

      <rect x="626" y="100" width="148" height="32" rx="6" fill="#166534" filter="url(#shadow)"/>
      <text x="700" y="120" text-anchor="middle" fill="white" font-size="11" font-weight="600">AWS S3 / Dropbox / GDrive</text>

      <rect x="626" y="150" width="148" height="32" rx="6" fill="#166534" filter="url(#shadow)"/>
      <text x="700" y="170" text-anchor="middle" fill="white" font-size="11" font-weight="600">Gmail SMTP / SendGrid</text>

      <rect x="626" y="200" width="148" height="32" rx="6" fill="#166534" filter="url(#shadow)"/>
      <text x="700" y="220" text-anchor="middle" fill="white" font-size="11" font-weight="600">Twilio / SendGrid SMS</text>

      <rect x="626" y="250" width="148" height="32" rx="6" fill="#166534" filter="url(#shadow)"/>
      <text x="700" y="270" text-anchor="middle" fill="white" font-size="11" font-weight="600">External API Callbacks</text>

      <rect x="626" y="300" width="148" height="32" rx="6" fill="#1F6E3A" filter="url(#shadow)"/>
      <text x="700" y="320" text-anchor="middle" fill="white" font-size="11" font-weight="600">Geo IP Lookup</text>

      <!-- Databases -->
      <rect x="296" y="565" width="108" height="50" rx="6" fill="#5B21B6" filter="url(#shadow)"/>
      <text x="350" y="585" text-anchor="middle" fill="white" font-size="11" font-weight="600">Master DB</text>
      <text x="350" y="600" text-anchor="middle" fill="#C4B5FD" font-size="10">(Companies, Users)</text>

      <rect x="424" y="565" width="108" height="50" rx="6" fill="#6D28D9" filter="url(#shadow)"/>
      <text x="478" y="585" text-anchor="middle" fill="white" font-size="11" font-weight="600">Company DB</text>
      <text x="478" y="600" text-anchor="middle" fill="#C4B5FD" font-size="10">(per company)</text>

      <rect x="552" y="565" width="108" height="50" rx="6" fill="#6D28D9" filter="url(#shadow)"/>
      <text x="606" y="585" text-anchor="middle" fill="white" font-size="11" font-weight="600">Redis Cache</text>
      <text x="606" y="600" text-anchor="middle" fill="#C4B5FD" font-size="10">(OTP, Lock, Idem.)</text>

      <!-- Arrows: Frontend → API Gateway -->
      <line x1="195" y1="68" x2="294" y2="68" stroke="#F97316" stroke-width="1.5" marker-end="url(#arr)"/>
      <line x1="195" y1="118" x2="294" y2="68" stroke="#94A3B8" stroke-width="1" marker-end="url(#arr-gray)" stroke-dasharray="4,2"/>
      <line x1="195" y1="168" x2="294" y2="68" stroke="#94A3B8" stroke-width="1" marker-end="url(#arr-gray)" stroke-dasharray="4,2"/>
      <line x1="195" y1="218" x2="294" y2="68" stroke="#94A3B8" stroke-width="1" marker-end="url(#arr-gray)" stroke-dasharray="4,2"/>
      <line x1="195" y1="268" x2="294" y2="68" stroke="#94A3B8" stroke-width="1" marker-end="url(#arr-gray)" stroke-dasharray="4,2"/>
      <line x1="195" y1="318" x2="294" y2="68" stroke="#94A3B8" stroke-width="1" marker-end="url(#arr-gray)" stroke-dasharray="4,2"/>

      <!-- API Gateway → Services -->
      <line x1="346" y1="86" x2="346" y2="108" stroke="#F97316" stroke-width="1.5" marker-end="url(#arr)"/>
      <line x1="474" y1="86" x2="474" y2="108" stroke="#F97316" stroke-width="1.5" marker-end="url(#arr)"/>
      <line x1="346" y1="146" x2="346" y2="163" stroke="#EA580C" stroke-width="1.5" marker-end="url(#arr)"/>
      <line x1="474" y1="146" x2="474" y2="163" stroke="#EA580C" stroke-width="1.5" marker-end="url(#arr)"/>
      <line x1="346" y1="201" x2="346" y2="218" stroke="#C2410C" stroke-width="1.5" marker-end="url(#arr)"/>
      <line x1="474" y1="201" x2="474" y2="218" stroke="#C2410C" stroke-width="1.5" marker-end="url(#arr)"/>
      <line x1="346" y1="256" x2="346" y2="273" stroke="#9A3412" stroke-width="1.5" marker-end="url(#arr)"/>
      <line x1="474" y1="256" x2="474" y2="273" stroke="#9A3412" stroke-width="1.5" marker-end="url(#arr)"/>

      <!-- Services → External -->
      <line x1="524" y1="127" x2="624" y2="66" stroke="#16A34A" stroke-width="1.5" marker-end="url(#arr-green)" stroke-dasharray="5,2"/>
      <line x1="524" y1="182" x2="624" y2="116" stroke="#16A34A" stroke-width="1.5" marker-end="url(#arr-green)" stroke-dasharray="5,2"/>
      <line x1="524" y1="182" x2="624" y2="166" stroke="#16A34A" stroke-width="1.5" marker-end="url(#arr-green)" stroke-dasharray="5,2"/>
      <line x1="524" y1="182" x2="624" y2="216" stroke="#16A34A" stroke-width="1.5" marker-end="url(#arr-green)" stroke-dasharray="5,2"/>
      <line x1="524" y1="292" x2="624" y2="266" stroke="#16A34A" stroke-width="1.5" marker-end="url(#arr-green)" stroke-dasharray="5,2"/>

      <!-- Services → DB -->
      <line x1="410" y1="465" x2="410" y2="563" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#arr)"/>
      <line x1="474" y1="311" x2="524" y2="578" stroke="#94A3B8" stroke-width="1" stroke-dasharray="4,2" marker-end="url(#arr-gray)"/>

      <!-- External API label -->
      <rect x="800" y="420" width="180" height="50" rx="8" fill="#0F172A" opacity="0.9"/>
      <text x="890" y="440" text-anchor="middle" fill="white" font-size="10" font-weight="700">External Systems</text>
      <text x="890" y="455" text-anchor="middle" fill="#94A3B8" font-size="10">(CRM, ERP, Custom Apps)</text>
      <line x1="800" y1="445" x2="528" y2="68" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="8,3" marker-end="url(#arr-gray)"/>
    </svg>
  </div>

  <h3>Module Dependency Map</h3>
  <div class="diagram-wrap">
    <div class="diagram-title">Figure 2 — Module Dependencies (must be built top-down)</div>
    <svg viewBox="0 0 900 300" class="flow-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="dep" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#F97316"/>
        </marker>
      </defs>
      <!-- Layer labels -->
      <text x="10" y="55" fill="#94A3B8" font-size="10" font-weight="700" letter-spacing="1">FOUNDATION</text>
      <text x="10" y="125" fill="#94A3B8" font-size="10" font-weight="700" letter-spacing="1">CORE FLOW</text>
      <text x="10" y="205" fill="#94A3B8" font-size="10" font-weight="700" letter-spacing="1">PROCESSING</text>
      <text x="10" y="275" fill="#94A3B8" font-size="10" font-weight="700" letter-spacing="1">OBSERVABILITY</text>

      <!-- Row 1 -->
      <rect x="100" y="35" width="140" height="40" rx="8" fill="#F97316"/>
      <text x="170" y="59" text-anchor="middle" fill="white" font-size="12" font-weight="700">M1: Settings</text>
      <rect x="280" y="35" width="140" height="40" rx="8" fill="#F97316"/>
      <text x="350" y="59" text-anchor="middle" fill="white" font-size="12" font-weight="700">M2: Templates</text>

      <!-- Row 2 -->
      <rect x="180" y="105" width="140" height="40" rx="8" fill="#EA580C"/>
      <text x="250" y="129" text-anchor="middle" fill="white" font-size="12" font-weight="700">M3: External API</text>
      <rect x="360" y="105" width="140" height="40" rx="8" fill="#EA580C"/>
      <text x="430" y="129" text-anchor="middle" fill="white" font-size="12" font-weight="700">M4: Signer Page</text>

      <!-- Row 3 -->
      <rect x="280" y="180" width="140" height="40" rx="8" fill="#C2410C"/>
      <text x="350" y="204" text-anchor="middle" fill="white" font-size="12" font-weight="700">M5: Doc Engine</text>

      <!-- Row 4 -->
      <rect x="180" y="255" width="140" height="40" rx="8" fill="#64748B"/>
      <text x="250" y="271" text-anchor="middle" fill="white" font-size="11" font-weight="700">M7: Audit Log</text>
      <text x="250" y="285" text-anchor="middle" fill="white" font-size="10">(wire in all layers)</text>
      <rect x="360" y="255" width="140" height="40" rx="8" fill="#64748B"/>
      <text x="430" y="279" text-anchor="middle" fill="white" font-size="11" font-weight="700">M6: Msg Center</text>

      <!-- Dep arrows -->
      <line x1="170" y1="75" x2="240" y2="103" stroke="#F97316" stroke-width="2" marker-end="url(#dep)"/>
      <line x1="350" y1="75" x2="350" y2="178" stroke="#F97316" stroke-width="2" stroke-dasharray="5,2" marker-end="url(#dep)"/>
      <line x1="350" y1="75" x2="260" y2="103" stroke="#F97316" stroke-width="2" marker-end="url(#dep)"/>
      <line x1="350" y1="75" x2="430" y2="103" stroke="#F97316" stroke-width="2" marker-end="url(#dep)"/>
      <line x1="250" y1="145" x2="310" y2="178" stroke="#EA580C" stroke-width="2" marker-end="url(#dep)"/>
      <line x1="430" y1="145" x2="390" y2="178" stroke="#EA580C" stroke-width="2" marker-end="url(#dep)"/>
      <line x1="350" y1="220" x2="300" y2="253" stroke="#C2410C" stroke-width="2" marker-end="url(#dep)"/>
      <line x1="350" y1="220" x2="400" y2="253" stroke="#C2410C" stroke-width="2" marker-end="url(#dep)"/>

      <!-- Build order badges -->
      <text x="570" y="55" fill="#0F172A" font-size="11" font-weight="700">⬅ Build order:</text>
      <text x="570" y="75" fill="#F97316" font-size="11" font-weight="700">① M1 Settings</text>
      <text x="570" y="95" fill="#F97316" font-size="11" font-weight="700">② M2 Templates</text>
      <text x="570" y="115" fill="#EA580C" font-size="11" font-weight="700">③ M3 External API</text>
      <text x="570" y="135" fill="#EA580C" font-size="11" font-weight="700">④ M4 Signer Page</text>
      <text x="570" y="155" fill="#C2410C" font-size="11" font-weight="700">⑤ M5 Document Engine</text>
      <text x="570" y="175" fill="#64748B" font-size="11" font-weight="700">⑥ M7 Audit (parallel)</text>
      <text x="570" y="195" fill="#64748B" font-size="11" font-weight="700">⑦ M6 Message Center</text>
    </svg>
  </div>
</div>

<hr/>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- M1: SETTINGS -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="section" id="m1">
  <div class="section-head">
    <div class="s-num">M1</div>
    <h2>Settings Module</h2>
    <span class="s-tag">FOUNDATION · P0 BLOCKER</span>
  </div>
  <div class="mod-banner">
    <span class="mod-id">M1</span>
    <span class="mod-name">Company Settings</span>
    <span class="mod-desc">Must be configured before any e-sign workflow can operate. Stores provider credentials for Storage, Email, and SMS.</span>
  </div>

  <p>Settings is the foundation module. All other modules depend on it — the active storage provider stores signed PDFs, the active email/SMS provider delivers OTPs and signing notifications. All sensitive credentials are AES-256 encrypted at rest. Only one provider per type can be active at any time (correctness property #1).</p>

  <h3>Settings Schema</h3>
  <div class="schema"><pre>
<span class="sk">Settings</span> {                                    <span class="sc">// One document per company</span>
  _id            : ObjectId
  company_id     : String                      <span class="sc">// ties to master DB</span>

  <span class="sk">storage</span>: {
    active       : <span class="st">"s3" | "dropbox" | "gdrive"</span>
    s3           : { bucket, region, access_key, secret_key }  <span class="sc">// encrypted</span>
    dropbox      : { app_key, app_secret, refresh_token }      <span class="sc">// encrypted</span>
    gdrive       : { service_account_json, folder_id }         <span class="sc">// encrypted</span>
    folder_path  : String                      <span class="sc">// e.g. "signed-docs/2025/"</span>
    file_prefix  : String                      <span class="sc">// e.g. "SGDOC"</span>
    file_suffix  : String                      <span class="sc">// e.g. "final"</span>
    file_delimiter: String                     <span class="sc">// e.g. "-" → SGDOC-{doc_id}-final.pdf</span>
  }

  <span class="sk">email</span>: {
    active       : <span class="st">"smtp" | "sendgrid"</span>
    smtp         : { host, port, user, password, from_name, from_email }
    sendgrid     : { api_key, from_email, from_name }
  }

  <span class="sk">sms</span>: {
    active       : <span class="st">"twilio" | "sendgrid_sms"</span>
    twilio       : { account_sid, auth_token, from_number }
    sendgrid_sms : { api_key, from_number }
  }

  updated_at     : Date
  updated_by     : ObjectId                    <span class="sc">// ref: Users</span>
}
</pre></div>

  <h3>API Routes</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Method</th><th>Route</th><th>Action</th><th>Auth</th></tr></thead>
      <tbody>
        <tr><td><span class="badge b-get">GET</span></td><td>/api/company/settings</td><td>Get settings (sensitive fields masked)</td><td>JWT + Admin</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/company/settings/storage</td><td>Save storage config, validate credentials</td><td>JWT + Super Admin</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/company/settings/email</td><td>Save email config, send test email</td><td>JWT + Super Admin</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/company/settings/sms</td><td>Save SMS config, send test SMS</td><td>JWT + Super Admin</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/company/settings/storage/test</td><td>Test connection to configured storage provider</td><td>JWT + Super Admin</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/company/settings/email/test</td><td>Send test email to requesting user</td><td>JWT + Super Admin</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/company/settings/sms/test</td><td>Send test OTP SMS to provided number</td><td>JWT + Super Admin</td></tr>
        <tr><td><span class="badge b-get">GET</span></td><td>/api/company/settings/api-keys</td><td>List API keys (prefix shown only)</td><td>JWT + Super Admin</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/company/settings/api-keys</td><td>Generate new API key (plain shown once)</td><td>JWT + Super Admin</td></tr>
        <tr><td><span class="badge b-del">DEL</span></td><td>/api/company/settings/api-keys/:id</td><td>Revoke API key</td><td>JWT + Super Admin</td></tr>
      </tbody>
    </table>
  </div>

  <div class="cards c3">
    <div class="card ob">
      <div class="icon">💾</div>
      <h4>Storage Tab UI</h4>
      <ul>
        <li>Provider radio cards (S3, Dropbox, GDrive)</li>
        <li>Fields appear per selected provider</li>
        <li>Folder path + file naming config</li>
        <li>"Test Connection" → inline status badge</li>
      </ul>
    </div>
    <div class="card ob">
      <div class="icon">📧</div>
      <h4>Email Tab UI</h4>
      <ul>
        <li>Provider radio (SMTP / SendGrid)</li>
        <li>Password fields with reveal toggle</li>
        <li>"Send Test Email" → delivery confirmation</li>
        <li>From name + From email config</li>
      </ul>
    </div>
    <div class="card ob">
      <div class="icon">📱</div>
      <h4>SMS Tab UI</h4>
      <ul>
        <li>Provider radio (Twilio / SendGrid SMS)</li>
        <li>"Send Test SMS" with phone number input</li>
        <li>From number configuration</li>
        <li>Unsaved changes warning on tab switch</li>
      </ul>
    </div>
  </div>
</div>

<hr/>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- M2: TEMPLATE ENGINE -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="section" id="m2">
  <div class="section-head">
    <div class="s-num">M2</div>
    <h2>Template Engine</h2>
    <span class="s-tag">BUILDER · DELIMITER CONFIG · SIGNATURE CONFIG</span>
  </div>
  <div class="mod-banner">
    <span class="mod-id">M2</span>
    <span class="mod-name">Template Engine</span>
    <span class="mod-desc">Central configuration hub — every document behavior is defined here. Consumed by all downstream modules at runtime.</span>
  </div>

  <p>The Template Engine is the most critical configuration module. Every behavioral aspect of a document — delimiters, signature types, MFA, expiry, notifications, post-sign actions, storage naming, API callbacks — is configured per template. All other modules read from this snapshot at runtime, ensuring that changes to a template don't retroactively affect in-flight documents.</p>

  <h3>Template Schema</h3>
  <div class="schema"><pre>
<span class="sk">Template</span> {
  _id              : ObjectId
  name             : String
  status           : <span class="st">"draft" | "active" | "archived"</span>
  html_content     : String               <span class="sc">// raw HTML with {{delimiter}} placeholders</span>

  <span class="sk">delimiters</span>: [{
    key            : String               <span class="sc">// e.g. "{{client_name}}"</span>
    label          : String               <span class="sc">// e.g. "Client Full Name"</span>
    type           : <span class="st">"text" | "date" | "number" | "email" | "phone"</span>
    required       : Boolean
    default_value  : String
  }]

  email_subject    : String               <span class="sc">// supports delimiters</span>
  email_body       : String               <span class="sc">// HTML, supports delimiters</span>

  <span class="sk">signature_config</span>: {
    type           : <span class="st">"single" | "multiple" | "hierarchy" | "send_to_all"</span>
    hierarchy      : <span class="st">"sequential" | "parallel"</span>
    signer_count   : Number
    zones          : [{ zone_id, label, signer_order }]
  }

  <span class="sk">mfa</span>: {
    enabled        : Boolean
    channel        : <span class="st">"email" | "sms" | "both"</span>
    fallback       : Boolean              <span class="sc">// fail over to other channel</span>
    otp_expiry_min : Number
  }

  <span class="sk">track_events</span>: { opened, signed, rejected }

  <span class="sk">notify_events</span>: [{
    event          : <span class="st">"opened" | "signed" | "rejected" | "expired"</span>
    channel        : <span class="st">"email" | "sms" | "both"</span>
    to             : [{ type: "user_ref" | "manual", value: String }]
    cc             : [{ type: "user_ref" | "manual", value: String }]
    email_subject, email_body, sms_body
  }]

  <span class="sk">post_sign</span>: {
    pdf_attachment         : Boolean
    send_copy_to_recipient : Boolean
    send_copy_to_list      : [{ type, value }]
    email_subject, email_body
  }

  <span class="sk">api_callback</span>: {
    enabled        : Boolean
    url            : String
    retry_attempts : Number              <span class="sc">// webhook retry count (default: 3)</span>
    retry_backoff  : String              <span class="sc">// "exponential" | "fixed"</span>
    delimiters_to_send : [String]
    custom_properties  : Map
  }

  <span class="sk">link_expiry</span>: { value: Number, unit: "minutes" | "hours" | "days" }

  preview_enabled  : Boolean            <span class="sc">// company user preview before send</span>

  created_by : ObjectId, created_at : Date, updated_at : Date
}
</pre></div>

  <h3>Signature Type Decision</h3>
  <div class="diagram-wrap">
    <div class="diagram-title">Figure 3 — Signature Types & Link Activation Logic</div>
    <svg viewBox="0 0 900 260" class="flow-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="at2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#94A3B8"/>
        </marker>
        <marker id="at3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#16A34A"/>
        </marker>
      </defs>

      <!-- single -->
      <rect x="10" y="10" width="200" height="240" rx="10" fill="#FFF7ED" stroke="#FED7AA" stroke-width="1.5"/>
      <text x="110" y="32" text-anchor="middle" fill="#C2410C" font-size="11" font-weight="700">SINGLE</text>
      <rect x="30" y="50" width="160" height="36" rx="6" fill="#F97316"/>
      <text x="110" y="73" text-anchor="middle" fill="white" font-size="11" font-weight="600">✓ Signer 1 (active)</text>
      <text x="110" y="115" text-anchor="middle" fill="#64748B" font-size="11">1 signer</text>
      <text x="110" y="132" text-anchor="middle" fill="#64748B" font-size="11">1 link generated</text>
      <text x="110" y="149" text-anchor="middle" fill="#64748B" font-size="11">Link active immediately</text>
      <text x="110" y="175" text-anchor="middle" fill="#C2410C" font-size="10" font-weight="600">→ Complete on sign</text>

      <!-- multiple -->
      <rect x="230" y="10" width="200" height="240" rx="10" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5"/>
      <text x="330" y="32" text-anchor="middle" fill="#1D4ED8" font-size="11" font-weight="700">MULTIPLE (PARALLEL)</text>
      <rect x="250" y="50" width="160" height="28" rx="6" fill="#2563EB"/>
      <text x="330" y="68" text-anchor="middle" fill="white" font-size="11" font-weight="600">✓ Signer 1 (active)</text>
      <rect x="250" y="84" width="160" height="28" rx="6" fill="#2563EB"/>
      <text x="330" y="102" text-anchor="middle" fill="white" font-size="11" font-weight="600">✓ Signer 2 (active)</text>
      <rect x="250" y="118" width="160" height="28" rx="6" fill="#2563EB"/>
      <text x="330" y="136" text-anchor="middle" fill="white" font-size="11" font-weight="600">✓ Signer N (active)</text>
      <text x="330" y="170" text-anchor="middle" fill="#64748B" font-size="11">All links active at once</text>
      <text x="330" y="195" text-anchor="middle" fill="#1D4ED8" font-size="10" font-weight="600">→ Complete when ALL signed</text>

      <!-- hierarchy -->
      <rect x="450" y="10" width="200" height="240" rx="10" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1.5"/>
      <text x="550" y="32" text-anchor="middle" fill="#5B21B6" font-size="11" font-weight="700">HIERARCHY (SEQUENTIAL)</text>
      <rect x="470" y="50" width="160" height="28" rx="6" fill="#7C3AED"/>
      <text x="550" y="68" text-anchor="middle" fill="white" font-size="11" font-weight="600">✓ Signer 1 (active)</text>
      <rect x="470" y="85" width="160" height="28" rx="6" fill="#DDD6FE"/>
      <text x="550" y="103" text-anchor="middle" fill="#64748B" font-size="11" font-weight="600">⏸ Signer 2 (locked)</text>
      <rect x="470" y="120" width="160" height="28" rx="6" fill="#DDD6FE"/>
      <text x="550" y="138" text-anchor="middle" fill="#64748B" font-size="11" font-weight="600">⏸ Signer N (locked)</text>
      <text x="550" y="165" text-anchor="middle" fill="#64748B" font-size="11">Unlock on prior sign</text>
      <text x="550" y="182" text-anchor="middle" fill="#64748B" font-size="11">Token rotated on advance</text>
      <text x="550" y="207" text-anchor="middle" fill="#5B21B6" font-size="10" font-weight="600">→ Complete when ALL signed</text>

      <!-- send_to_all -->
      <rect x="670" y="10" width="210" height="240" rx="10" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"/>
      <text x="775" y="32" text-anchor="middle" fill="#166534" font-size="11" font-weight="700">SEND TO ALL (BROADCAST)</text>
      <rect x="690" y="50" width="170" height="28" rx="6" fill="#16A34A"/>
      <text x="775" y="68" text-anchor="middle" fill="white" font-size="11" font-weight="600">✓ Signer 1 (active)</text>
      <rect x="690" y="84" width="170" height="28" rx="6" fill="#16A34A"/>
      <text x="775" y="102" text-anchor="middle" fill="white" font-size="11" font-weight="600">✓ Signer 2 (active)</text>
      <rect x="690" y="118" width="170" height="28" rx="6" fill="#16A34A"/>
      <text x="775" y="136" text-anchor="middle" fill="white" font-size="11" font-weight="600">✓ Signer N (active)</text>
      <text x="775" y="165" text-anchor="middle" fill="#64748B" font-size="11">Same doc to all</text>
      <text x="775" y="182" text-anchor="middle" fill="#64748B" font-size="11">Each signs independently</text>
      <text x="775" y="207" text-anchor="middle" fill="#166534" font-size="10" font-weight="600">→ Each doc complete separately</text>
    </svg>
  </div>

  <h3>Template Builder — Tab Structure</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Tab #</th><th>Name</th><th>Component</th><th>Key UI Elements</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>HTML Content</td><td>ContentTab.jsx</td><td>CodeMirror HTML editor, live split-view preview, "Extract Delimiters" button</td></tr>
        <tr><td>2</td><td>Delimiters</td><td>DelimitersTab.jsx</td><td>Auto-populated table from extraction, editable label/type/required, manual add</td></tr>
        <tr><td>3</td><td>Signature Config</td><td>SignatureTab.jsx</td><td>Type selector (single/multiple/hierarchy/send_to_all), signer count, zone assignment</td></tr>
        <tr><td>4</td><td>Email Content</td><td>EmailContentTab.jsx</td><td>Subject, rich-text body editor, delimiter picker for dynamic insertion</td></tr>
        <tr><td>5</td><td>MFA Settings</td><td>MFATab.jsx</td><td>Enable toggle, channel (email/sms/both), fallback toggle, OTP expiry minutes</td></tr>
        <tr><td>6</td><td>Track & Notify</td><td>TrackNotifyTab.jsx</td><td>Event checkboxes, per-event notification config (channel, to/cc picker)</td></tr>
        <tr><td>7</td><td>Post-Sign Config</td><td>PostSignTab.jsx</td><td>PDF attachment, copy-to-recipient, send-to list, email body for signed copy</td></tr>
        <tr><td>8</td><td>API Callback</td><td>ApiCallbackTab.jsx</td><td>URL, delimiter selection, retry config, custom properties, test trigger</td></tr>
        <tr><td>9</td><td>Link & Storage</td><td>LinkStorageTab.jsx</td><td>Expiry value + unit, optional storage folder/prefix/suffix override</td></tr>
        <tr><td>10</td><td>Payload Schema</td><td>PayloadSchemaTab.jsx</td><td>Read-only generated JSON, copy button, download, "Share with developer"</td></tr>
      </tbody>
    </table>
  </div>

  <h3>API Routes</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Method</th><th>Route</th><th>Action</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td><span class="badge b-get">GET</span></td><td>/api/company/templates</td><td>List templates — paginated DataTable</td><td>Filter by status, search by name</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/company/templates</td><td>Create new template</td><td>Auto-extract delimiters from html_content</td></tr>
        <tr><td><span class="badge b-get">GET</span></td><td>/api/company/templates/:id</td><td>Get single template full config</td><td>Used to load builder</td></tr>
        <tr><td><span class="badge b-put">PUT</span></td><td>/api/company/templates/:id</td><td>Update any config section</td><td>Partial update supported</td></tr>
        <tr><td><span class="badge b-del">DEL</span></td><td>/api/company/templates/:id</td><td>Soft-delete (isDeleted=true)</td><td>Blocked if active documents exist</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/company/templates/:id/extract-delimiters</td><td>Parse HTML → return delimiter array</td><td>Called on HTML paste/save</td></tr>
        <tr><td><span class="badge b-get">GET</span></td><td>/api/company/templates/:id/payload-schema</td><td>Return finalized payload JSON structure</td><td>For external API consumers</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/company/templates/:id/duplicate</td><td>Clone template with new name</td><td>Copies all config</td></tr>
        <tr><td><span class="badge b-get">GET</span></td><td>/api/company/templates/:id/preview</td><td>Rendered HTML with sample data</td><td>Used in builder preview panel</td></tr>
      </tbody>
    </table>
  </div>
</div>

<hr/>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- M3: EXTERNAL API -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="section" id="m3">
  <div class="section-head">
    <div class="s-num">M3</div>
    <h2>External API — E-Sign Initiation</h2>
    <span class="s-tag">API KEY AUTH · WORKFLOW CREATION</span>
  </div>
  <div class="mod-banner">
    <span class="mod-id">M3</span>
    <span class="mod-name">External API</span>
    <span class="mod-desc">Public REST entry point for CRMs, ERPs, and custom systems. Authenticated via company-level API keys. No JWT cookies.</span>
  </div>

  <h3>API Initiation Workflow</h3>
  <div class="diagram-wrap">
    <div class="diagram-title">Figure 4 — API Initiation Flow (POST /api/v1/esign/initiate)</div>
    <svg viewBox="0 0 980 120" class="flow-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="fl" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#F97316"/>
        </marker>
        <marker id="fl-r" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#DC2626"/>
        </marker>
      </defs>
      <!-- Steps -->
      <rect x="10" y="30" width="100" height="50" rx="6" fill="#0F172A"/>
      <text x="60" y="58" text-anchor="middle" fill="white" font-size="10" font-weight="700">External</text>
      <text x="60" y="71" text-anchor="middle" fill="white" font-size="10" font-weight="700">System</text>

      <line x1="110" y1="55" x2="128" y2="55" stroke="#F97316" stroke-width="2" marker-end="url(#fl)"/>
      <rect x="130" y="30" width="100" height="50" rx="6" fill="#F97316"/>
      <text x="180" y="52" text-anchor="middle" fill="white" font-size="10" font-weight="700">① Validate</text>
      <text x="180" y="65" text-anchor="middle" fill="white" font-size="10">API Key</text>
      <text x="180" y="78" text-anchor="middle" fill="white" font-size="10">+ Company</text>

      <line x1="230" y1="55" x2="248" y2="55" stroke="#F97316" stroke-width="2" marker-end="url(#fl)"/>
      <rect x="250" y="30" width="100" height="50" rx="6" fill="#F97316"/>
      <text x="300" y="52" text-anchor="middle" fill="white" font-size="10" font-weight="700">② Validate</text>
      <text x="300" y="65" text-anchor="middle" fill="white" font-size="10">Template +</text>
      <text x="300" y="78" text-anchor="middle" fill="white" font-size="10">Payload</text>

      <line x1="350" y1="55" x2="368" y2="55" stroke="#F97316" stroke-width="2" marker-end="url(#fl)"/>
      <rect x="370" y="30" width="100" height="50" rx="6" fill="#EA580C"/>
      <text x="420" y="52" text-anchor="middle" fill="white" font-size="10" font-weight="700">③ Create</text>
      <text x="420" y="65" text-anchor="middle" fill="white" font-size="10">Document +</text>
      <text x="420" y="78" text-anchor="middle" fill="white" font-size="10">Recipients</text>

      <line x1="470" y1="55" x2="488" y2="55" stroke="#F97316" stroke-width="2" marker-end="url(#fl)"/>
      <rect x="490" y="30" width="100" height="50" rx="6" fill="#EA580C"/>
      <text x="540" y="52" text-anchor="middle" fill="white" font-size="10" font-weight="700">④ Generate</text>
      <text x="540" y="65" text-anchor="middle" fill="white" font-size="10">JWT Tokens</text>
      <text x="540" y="78" text-anchor="middle" fill="white" font-size="10">+ URLs</text>

      <line x1="590" y1="55" x2="608" y2="55" stroke="#F97316" stroke-width="2" marker-end="url(#fl)"/>
      <rect x="610" y="30" width="100" height="50" rx="6" fill="#C2410C"/>
      <text x="660" y="52" text-anchor="middle" fill="white" font-size="10" font-weight="700">⑤ Send</text>
      <text x="660" y="65" text-anchor="middle" fill="white" font-size="10">Notification</text>
      <text x="660" y="78" text-anchor="middle" fill="white" font-size="10">(Email/SMS)</text>

      <line x1="710" y1="55" x2="728" y2="55" stroke="#F97316" stroke-width="2" marker-end="url(#fl)"/>
      <rect x="730" y="30" width="100" height="50" rx="6" fill="#C2410C"/>
      <text x="780" y="52" text-anchor="middle" fill="white" font-size="10" font-weight="700">⑥ Audit Log</text>
      <text x="780" y="65" text-anchor="middle" fill="white" font-size="10">document_created</text>
      <text x="780" y="78" text-anchor="middle" fill="white" font-size="10">link_sent</text>

      <line x1="830" y1="55" x2="848" y2="55" stroke="#F97316" stroke-width="2" marker-end="url(#fl)"/>
      <rect x="850" y="30" width="110" height="50" rx="6" fill="#166534"/>
      <text x="905" y="52" text-anchor="middle" fill="white" font-size="10" font-weight="700">⑦ Return</text>
      <text x="905" y="65" text-anchor="middle" fill="white" font-size="10">doc_id, URLs</text>
      <text x="905" y="78" text-anchor="middle" fill="white" font-size="10">expires_at</text>

      <!-- Error path -->
      <text x="180" y="16" text-anchor="middle" fill="#DC2626" font-size="9" font-weight="700">→ 401 if invalid</text>
      <text x="300" y="16" text-anchor="middle" fill="#DC2626" font-size="9" font-weight="700">→ 400 if missing</text>
    </svg>
  </div>

  <h3>Preview Mode Flow</h3>
  <div class="info-box o">
    <h4>When template.preview_enabled = true</h4>
    <p>Instead of immediately distributing the signing link to recipients, the initiation response returns a <strong>preview URL</strong> for a company user to review the filled document. The company user must click <strong>"Send"</strong> on the preview page to trigger actual distribution. This adds a human approval gate before signers are notified.</p>
  </div>

  <div class="diagram-wrap">
    <div class="diagram-title">Figure 5 — Preview-Enabled vs Direct Distribution Flow</div>
    <svg viewBox="0 0 900 200" class="flow-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="fl2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#F97316"/>
        </marker>
        <marker id="fl2b" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#2563EB"/>
        </marker>
      </defs>

      <!-- Path A - Direct -->
      <text x="10" y="50" fill="#166534" font-size="11" font-weight="700">PATH A: preview_enabled=false</text>
      <rect x="10" y="60" width="110" height="36" rx="6" fill="#F97316"/>
      <text x="65" y="83" text-anchor="middle" fill="white" font-size="11" font-weight="600">API Call</text>
      <line x1="120" y1="78" x2="148" y2="78" stroke="#F97316" stroke-width="2" marker-end="url(#fl2)"/>
      <rect x="150" y="60" width="130" height="36" rx="6" fill="#EA580C"/>
      <text x="215" y="78" text-anchor="middle" fill="white" font-size="11" font-weight="600">Create Document</text>
      <text x="215" y="90" text-anchor="middle" fill="white" font-size="10">status=pending</text>
      <line x1="280" y1="78" x2="308" y2="78" stroke="#F97316" stroke-width="2" marker-end="url(#fl2)"/>
      <rect x="310" y="60" width="130" height="36" rx="6" fill="#C2410C"/>
      <text x="375" y="78" text-anchor="middle" fill="white" font-size="11" font-weight="600">Send to Signers</text>
      <text x="375" y="90" text-anchor="middle" fill="white" font-size="10">immediately</text>
      <line x1="440" y1="78" x2="468" y2="78" stroke="#F97316" stroke-width="2" marker-end="url(#fl2)"/>
      <rect x="470" y="60" width="130" height="36" rx="6" fill="#166534"/>
      <text x="535" y="83" text-anchor="middle" fill="white" font-size="11" font-weight="600">Return doc_id</text>

      <!-- Path B - Preview -->
      <text x="10" y="135" fill="#1D4ED8" font-size="11" font-weight="700">PATH B: preview_enabled=true</text>
      <rect x="10" y="145" width="110" height="36" rx="6" fill="#2563EB"/>
      <text x="65" y="168" text-anchor="middle" fill="white" font-size="11" font-weight="600">API Call</text>
      <line x1="120" y1="163" x2="148" y2="163" stroke="#2563EB" stroke-width="2" marker-end="url(#fl2b)"/>
      <rect x="150" y="145" width="130" height="36" rx="6" fill="#2563EB"/>
      <text x="215" y="163" text-anchor="middle" fill="white" font-size="11" font-weight="600">Create Document</text>
      <text x="215" y="175" text-anchor="middle" fill="white" font-size="10">status=draft_preview</text>
      <line x1="280" y1="163" x2="308" y2="163" stroke="#2563EB" stroke-width="2" marker-end="url(#fl2b)"/>
      <rect x="310" y="145" width="130" height="36" rx="6" fill="#1D4ED8"/>
      <text x="375" y="163" text-anchor="middle" fill="white" font-size="11" font-weight="600">Return</text>
      <text x="375" y="175" text-anchor="middle" fill="white" font-size="10">preview_url</text>
      <line x1="440" y1="163" x2="468" y2="163" stroke="#2563EB" stroke-width="2" marker-end="url(#fl2b)"/>
      <rect x="470" y="145" width="130" height="36" rx="6" fill="#1D4ED8"/>
      <text x="535" y="163" text-anchor="middle" fill="white" font-size="11" font-weight="600">👤 User Reviews</text>
      <text x="535" y="175" text-anchor="middle" fill="white" font-size="10">+ clicks Send</text>
      <line x1="600" y1="163" x2="628" y2="163" stroke="#2563EB" stroke-width="2" marker-end="url(#fl2b)"/>
      <rect x="630" y="145" width="130" height="36" rx="6" fill="#166534"/>
      <text x="695" y="163" text-anchor="middle" fill="white" font-size="11" font-weight="600">Distribute to</text>
      <text x="695" y="175" text-anchor="middle" fill="white" font-size="10">Signers</text>
    </svg>
  </div>

  <h3>API Routes</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Method</th><th>Route</th><th>Auth</th><th>Description</th><th>Idempotency</th></tr></thead>
      <tbody>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/v1/esign/initiate</td><td>x-api-key</td><td>Core initiation — validate, create, generate URL, send notification</td><td>✅ Idempotency-Key header supported</td></tr>
        <tr><td><span class="badge b-get">GET</span></td><td>/api/v1/esign/status/:doc_id</td><td>x-api-key</td><td>Poll document status</td><td>—</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/v1/esign/cancel/:doc_id</td><td>x-api-key</td><td>Void/cancel pending document, notify signers</td><td>—</td></tr>
        <tr><td><span class="badge b-get">GET</span></td><td>/api/v1/esign/:doc_id/download</td><td>x-api-key</td><td>Get signed PDF presigned download URL</td><td>—</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/v1/esign/:doc_id/verify-pdf</td><td>x-api-key</td><td>Verify PDF SHA-256 hash integrity</td><td>—</td></tr>
      </tbody>
    </table>
  </div>
</div>

<hr/>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- M4: E-SIGN PUBLIC PAGE -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="section" id="m4">
  <div class="section-head">
    <div class="s-num">M4</div>
    <h2>E-Sign Public Page — Signer Experience</h2>
    <span class="s-tag">TOKEN AUTH · MFA · SIGNATURE PAD</span>
  </div>
  <div class="mod-banner">
    <span class="mod-id">M4</span>
    <span class="mod-name">E-Sign Signer Experience</span>
    <span class="mod-desc">Fully public-facing, no login required. Token-authenticated per signer. Entire UI driven by template config fetched server-side.</span>
  </div>

  <h3>Complete Signer Journey Flow</h3>
  <div class="diagram-wrap">
    <div class="diagram-title">Figure 6 — Full Signer Journey (with MFA + Token Rotation)</div>
    <svg viewBox="0 0 1020 520" class="flow-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="sj" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#F97316"/>
        </marker>
        <marker id="sj-r" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#DC2626"/>
        </marker>
        <marker id="sj-g" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#16A34A"/>
        </marker>
        <marker id="sj-b" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#2563EB"/>
        </marker>
      </defs>

      <!-- Start -->
      <ellipse cx="50" cy="40" rx="40" ry="20" fill="#0F172A"/>
      <text x="50" y="45" text-anchor="middle" fill="white" font-size="10" font-weight="700">Open URL</text>

      <!-- Step 1: Validate token -->
      <line x1="90" y1="40" x2="148" y2="40" stroke="#F97316" stroke-width="2" marker-end="url(#sj)"/>
      <rect x="150" y="20" width="130" height="40" rx="6" fill="#F97316"/>
      <text x="215" y="38" text-anchor="middle" fill="white" font-size="11" font-weight="700">Validate Token</text>
      <text x="215" y="52" text-anchor="middle" fill="white" font-size="10">+ Check Expiry</text>

      <!-- Error branches from token validation -->
      <line x1="215" y1="60" x2="215" y2="88" stroke="#DC2626" stroke-width="1.5" marker-end="url(#sj-r)" stroke-dasharray="4,2"/>
      <rect x="165" y="90" width="100" height="30" rx="6" fill="#FEF2F2" stroke="#FECACA"/>
      <text x="215" y="107" text-anchor="middle" fill="#DC2626" font-size="10" font-weight="600">Error Pages</text>
      <text x="45" y="85" fill="#DC2626" font-size="9">Expired / Revoked</text>
      <text x="45" y="97" fill="#DC2626" font-size="9">/ Already Signed</text>
      <text x="45" y="109" fill="#DC2626" font-size="9">/ Not Your Turn</text>
      <line x1="135" y1="100" x2="163" y2="100" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="3,2"/>

      <!-- Step 2: Check MFA -->
      <line x1="280" y1="40" x2="318" y2="40" stroke="#F97316" stroke-width="2" marker-end="url(#sj)"/>
      <rect x="320" y="20" width="130" height="40" rx="6" fill="#7C3AED"/>
      <text x="385" y="38" text-anchor="middle" fill="white" font-size="11" font-weight="700">MFA Enabled?</text>
      <text x="385" y="52" text-anchor="middle" fill="white" font-size="10">Check template config</text>

      <!-- MFA = No branch -->
      <line x1="450" y1="40" x2="478" y2="40" stroke="#F97316" stroke-width="2" marker-end="url(#sj)"/>
      <text x="462" y="35" text-anchor="middle" fill="#166534" font-size="9" font-weight="700">No</text>

      <!-- MFA = Yes branch down -->
      <line x1="385" y1="60" x2="385" y2="138" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#sj-b)"/>
      <text x="395" y="105" fill="#7C3AED" font-size="9" font-weight="700">Yes</text>
      <rect x="310" y="140" width="150" height="36" rx="6" fill="#6D28D9"/>
      <text x="385" y="157" text-anchor="middle" fill="white" font-size="10" font-weight="700">Send OTP (email/sms)</text>
      <text x="385" y="169" text-anchor="middle" fill="white" font-size="10">+ Show OTP Entry</text>

      <!-- OTP: fail branch -->
      <rect x="310" y="195" width="150" height="36" rx="6" fill="#5B21B6"/>
      <text x="385" y="213" text-anchor="middle" fill="white" font-size="10" font-weight="700">Verify OTP</text>
      <text x="385" y="226" text-anchor="middle" fill="white" font-size="10">(5 attempts max)</text>
      <line x1="385" y1="176" x2="385" y2="193" stroke="#6D28D9" stroke-width="1.5" marker-end="url(#sj-b)"/>
      <line x1="460" y1="213" x2="520" y2="213" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="3,2"/>
      <text x="490" y="208" fill="#DC2626" font-size="9">Fail (5x)</text>
      <rect x="522" y="197" width="90" height="32" rx="6" fill="#FEF2F2" stroke="#FECACA"/>
      <text x="567" y="217" text-anchor="middle" fill="#DC2626" font-size="9" font-weight="700">LOCK 30min</text>

      <!-- OTP success → Token Rotation -->
      <line x1="385" y1="231" x2="385" y2="258" stroke="#5B21B6" stroke-width="1.5" marker-end="url(#sj-b)"/>
      <rect x="310" y="260" width="150" height="36" rx="6" fill="#4C1D95"/>
      <text x="385" y="278" text-anchor="middle" fill="white" font-size="10" font-weight="700">🔄 Rotate Token</text>
      <text x="385" y="291" text-anchor="middle" fill="white" font-size="10">New short-lived JWT</text>

      <!-- Join into document view -->
      <line x1="460" y1="278" x2="520" y2="278" stroke="#4C1D95" stroke-width="1.5" marker-end="url(#sj-b)"/>
      <line x1="480" y1="40" x2="480" y2="278" stroke="#F97316" stroke-width="1.5"/>
      <line x1="480" y1="278" x2="518" y2="278" stroke="#F97316" stroke-width="2" marker-end="url(#sj)"/>

      <!-- Document View -->
      <rect x="520" y="258" width="140" height="40" rx="6" fill="#F97316"/>
      <text x="590" y="276" text-anchor="middle" fill="white" font-size="11" font-weight="700">Load Document</text>
      <text x="590" y="289" text-anchor="middle" fill="white" font-size="10">HTML + payload injected</text>

      <!-- Signature -->
      <line x1="660" y1="278" x2="698" y2="278" stroke="#F97316" stroke-width="2" marker-end="url(#sj)"/>
      <rect x="700" y="258" width="140" height="40" rx="6" fill="#EA580C"/>
      <text x="770" y="274" text-anchor="middle" fill="white" font-size="11" font-weight="700">Draw / Type /</text>
      <text x="770" y="287" text-anchor="middle" fill="white" font-size="10">Upload Signature</text>

      <!-- Intent Confirm -->
      <line x1="770" y1="298" x2="770" y2="328" stroke="#EA580C" stroke-width="1.5" marker-end="url(#sj)"/>
      <rect x="700" y="330" width="140" height="36" rx="6" fill="#C2410C"/>
      <text x="770" y="348" text-anchor="middle" fill="white" font-size="10" font-weight="700">☑ Confirm Intent</text>
      <text x="770" y="361" text-anchor="middle" fill="white" font-size="10">"This is my legal sig"</text>

      <!-- Submit -->
      <line x1="770" y1="366" x2="770" y2="396" stroke="#C2410C" stroke-width="1.5" marker-end="url(#sj)"/>
      <rect x="700" y="398" width="140" height="40" rx="6" fill="#166534"/>
      <text x="770" y="416" text-anchor="middle" fill="white" font-size="11" font-weight="700">Submit Signature</text>
      <text x="770" y="429" text-anchor="middle" fill="white" font-size="10">POST /esign/:token/sign</text>

      <!-- Success -->
      <line x1="770" y1="438" x2="770" y2="468" stroke="#16A34A" stroke-width="1.5" marker-end="url(#sj-g)"/>
      <rect x="700" y="470" width="140" height="36" rx="6" fill="#15803D"/>
      <text x="770" y="488" text-anchor="middle" fill="white" font-size="11" font-weight="700">✅ Success Page</text>
      <text x="770" y="501" text-anchor="middle" fill="white" font-size="10">Download PDF option</text>

      <!-- Reject path -->
      <line x1="660" y1="290" x2="660" y2="420" stroke="#94A3B8" stroke-width="1" stroke-dasharray="4,2"/>
      <rect x="580" y="420" width="80" height="30" rx="6" fill="#64748B"/>
      <text x="620" y="440" text-anchor="middle" fill="white" font-size="10" font-weight="600">Reject →</text>
      <line x1="620" y1="430" x2="660" y2="430" stroke="#64748B" stroke-width="1" stroke-dasharray="3,2"/>
      <text x="570" y="415" fill="#64748B" font-size="9">Signer</text>
      <text x="570" y="427" fill="#64748B" font-size="9">clicks Decline</text>

      <!-- Backend trigger for sequential -->
      <rect x="830" y="408" width="170" height="50" rx="8" fill="#FFF7ED" stroke="#FED7AA"/>
      <text x="915" y="425" text-anchor="middle" fill="#C2410C" font-size="10" font-weight="700">If Sequential:</text>
      <text x="915" y="440" text-anchor="middle" fill="#C2410C" font-size="10">→ Rotate token for</text>
      <text x="915" y="454" text-anchor="middle" fill="#C2410C" font-size="10">next signer + notify</text>
      <line x1="840" y1="435" x2="840" y2="435"/>
    </svg>
  </div>

  <h3>Backend Public Routes</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Method</th><th>Route</th><th>Auth</th><th>Action</th></tr></thead>
      <tbody>
        <tr><td><span class="badge b-get">GET</span></td><td>/api/esign/:token</td><td>URL Token</td><td>Validate token → return rendered HTML + template config (sanitized)</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/esign/:token/otp/send</td><td>URL Token</td><td>Generate OTP → send via configured channel → store hashed OTP with expiry</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/esign/:token/otp/verify</td><td>URL Token</td><td>Verify OTP → rotate token → return short-lived signing session token</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/esign/:token/sign</td><td>Token + Session</td><td>Accept signature + intent → trigger document processing → respond</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/esign/:token/reject</td><td>URL Token</td><td>Signer declines — update status → notify → log audit</td></tr>
      </tbody>
    </table>
  </div>
</div>

<hr/>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- M5: DOCUMENT ENGINE -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="section" id="m5">
  <div class="section-head">
    <div class="s-num">M5</div>
    <h2>Document Engine + PDF Pipeline</h2>
    <span class="s-tag">LIFECYCLE · PDF GENERATION · POST-SIGN</span>
  </div>
  <div class="mod-banner">
    <span class="mod-id">M5</span>
    <span class="mod-name">Document Engine & PDF Pipeline</span>
    <span class="mod-desc">Manages full document lifecycle from creation through signed PDF generation, storage, and post-signature processing.</span>
  </div>

  <h3>Document Lifecycle State Machine</h3>
  <div class="diagram-wrap">
    <div class="diagram-title">Figure 7 — Document Status State Machine</div>
    <svg viewBox="0 0 900 380" class="flow-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="sm" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#F97316"/>
        </marker>
        <marker id="sm-r" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#DC2626"/>
        </marker>
        <marker id="sm-g" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#16A34A"/>
        </marker>
        <marker id="sm-gr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#64748B"/>
        </marker>
      </defs>

      <!-- States as rounded rects -->
      <!-- NEW (start) -->
      <ellipse cx="80" cy="60" rx="55" ry="28" fill="#0F172A"/>
      <text x="80" y="65" text-anchor="middle" fill="white" font-size="13" font-weight="700">NEW</text>

      <!-- DISTRIBUTED -->
      <rect x="200" y="35" width="130" height="50" rx="10" fill="#F97316"/>
      <text x="265" y="65" text-anchor="middle" fill="white" font-size="13" font-weight="700">DISTRIBUTED</text>

      <!-- OPENED -->
      <rect x="400" y="35" width="110" height="50" rx="10" fill="#2563EB"/>
      <text x="455" y="65" text-anchor="middle" fill="white" font-size="13" font-weight="700">OPENED</text>

      <!-- SIGNED (partial) -->
      <rect x="580" y="35" width="130" height="50" rx="10" fill="#EA580C"/>
      <text x="645" y="55" text-anchor="middle" fill="white" font-size="12" font-weight="700">PARTIALLY</text>
      <text x="645" y="70" text-anchor="middle" fill="white" font-size="12" font-weight="700">SIGNED</text>

      <!-- SIGNED (complete) -->
      <rect x="400" y="180" width="110" height="50" rx="10" fill="#16A34A"/>
      <text x="455" y="210" text-anchor="middle" fill="white" font-size="13" font-weight="700">SIGNED</text>

      <!-- COMPLETED -->
      <ellipse cx="655" cy="205" rx="60" ry="30" fill="#15803D"/>
      <text x="655" y="210" text-anchor="middle" fill="white" font-size="12" font-weight="700">COMPLETED</text>

      <!-- REJECTED -->
      <rect x="400" y="300" width="110" height="50" rx="10" fill="#64748B"/>
      <text x="455" y="330" text-anchor="middle" fill="white" font-size="13" font-weight="700">REJECTED</text>

      <!-- EXPIRED (arc) -->
      <rect x="190" y="300" width="110" height="50" rx="10" fill="#DC2626"/>
      <text x="245" y="330" text-anchor="middle" fill="white" font-size="13" font-weight="700">EXPIRED</text>

      <!-- CANCELLED -->
      <rect x="40" y="300" width="110" height="50" rx="10" fill="#7C3AED"/>
      <text x="95" y="330" text-anchor="middle" fill="white" font-size="13" font-weight="700">CANCELLED</text>

      <!-- Transitions -->
      <line x1="135" y1="60" x2="198" y2="60" stroke="#F97316" stroke-width="2" marker-end="url(#sm)"/>
      <text x="166" y="54" text-anchor="middle" fill="#64748B" font-size="9">API initiate</text>

      <line x1="330" y1="60" x2="398" y2="60" stroke="#F97316" stroke-width="2" marker-end="url(#sm)"/>
      <text x="364" y="54" text-anchor="middle" fill="#64748B" font-size="9">link opened</text>

      <line x1="510" y1="60" x2="578" y2="60" stroke="#F97316" stroke-width="2" marker-end="url(#sm)"/>
      <text x="544" y="54" text-anchor="middle" fill="#64748B" font-size="9">1st of multi signed</text>

      <!-- OPENED → SIGNED (single) -->
      <line x1="455" y1="85" x2="455" y2="178" stroke="#16A34A" stroke-width="2" marker-end="url(#sm-g)"/>
      <text x="412" y="140" fill="#64748B" font-size="9">single sign</text>

      <!-- PARTIALLY → SIGNED -->
      <path d="M 645 85 Q 645 135 555 205" stroke="#16A34A" stroke-width="2" fill="none" marker-end="url(#sm-g)"/>
      <text x="640" y="140" fill="#64748B" font-size="9">last sign</text>

      <!-- SIGNED → COMPLETED -->
      <line x1="510" y1="205" x2="593" y2="205" stroke="#16A34A" stroke-width="2" marker-end="url(#sm-g)"/>
      <text x="550" y="198" text-anchor="middle" fill="#64748B" font-size="9">PDF + post-sign</text>

      <!-- OPENED → REJECTED -->
      <line x1="455" y1="85" x2="455" y2="298" stroke="#64748B" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#sm-gr)"/>
      <text x="475" y="220" fill="#64748B" font-size="9">decline</text>

      <!-- Any → EXPIRED (cron) -->
      <path d="M 265 85 Q 265 200 245 298" stroke="#DC2626" stroke-width="1.5" fill="none" stroke-dasharray="6,3" marker-end="url(#sm-r)"/>
      <text x="210" y="200" fill="#DC2626" font-size="9" font-weight="600">cron</text>
      <text x="210" y="212" fill="#DC2626" font-size="9">every 15min</text>

      <!-- Any → CANCELLED -->
      <path d="M 80 88 Q 80 200 95 298" stroke="#7C3AED" stroke-width="1.5" fill="none" stroke-dasharray="6,3" marker-end="url(#sj-b)"/>
      <text x="25" y="200" fill="#7C3AED" font-size="9" font-weight="600">API cancel</text>

      <!-- Legend -->
      <rect x="720" y="30" width="170" height="120" rx="8" fill="#F8FAFC" stroke="#E2E8F0"/>
      <text x="805" y="50" text-anchor="middle" fill="#0F172A" font-size="11" font-weight="700">Legend</text>
      <circle cx="738" cy="68" r="5" fill="#F97316"/>
      <text x="750" y="72" fill="#334155" font-size="10">Normal flow</text>
      <line x1="733" y1="86" x2="748" y2="86" stroke="#16A34A" stroke-width="2"/>
      <text x="754" y="90" fill="#334155" font-size="10">Completion</text>
      <line x1="733" y1="104" x2="748" y2="104" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="4,2"/>
      <text x="754" y="108" fill="#334155" font-size="10">Error/Expiry</text>
      <line x1="733" y1="122" x2="748" y2="122" stroke="#64748B" stroke-width="1.5" stroke-dasharray="4,2"/>
      <text x="754" y="126" fill="#334155" font-size="10">Decline/Cancel</text>

      <!-- Final states note -->
      <rect x="720" y="168" width="170" height="70" rx="8" fill="#FFF7ED" stroke="#FED7AA"/>
      <text x="805" y="185" text-anchor="middle" fill="#C2410C" font-size="10" font-weight="700">Terminal States</text>
      <text x="805" y="200" text-anchor="middle" fill="#C2410C" font-size="10">COMPLETED ✓</text>
      <text x="805" y="215" text-anchor="middle" fill="#C2410C" font-size="10">EXPIRED / REJECTED</text>
      <text x="805" y="230" text-anchor="middle" fill="#C2410C" font-size="10">CANCELLED</text>
    </svg>
  </div>

  <h3>PDF Generation Pipeline</h3>
  <div class="diagram-wrap">
    <div class="diagram-title">Figure 8 — PDF Generation + Post-Sign Pipeline</div>
    <svg viewBox="0 0 980 120" class="flow-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="pf" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#F97316"/>
        </marker>
      </defs>
      <rect x="10" y="30" width="100" height="55" rx="6" fill="#16A34A"/>
      <text x="60" y="52" text-anchor="middle" fill="white" font-size="10" font-weight="700">All Signatures</text>
      <text x="60" y="65" text-anchor="middle" fill="white" font-size="10">Collected</text>
      <text x="60" y="78" text-anchor="middle" fill="white" font-size="9">(+ acquire lock)</text>

      <line x1="110" y1="57" x2="128" y2="57" stroke="#F97316" stroke-width="2" marker-end="url(#pf)"/>
      <rect x="130" y="30" width="110" height="55" rx="6" fill="#F97316"/>
      <text x="185" y="52" text-anchor="middle" fill="white" font-size="10" font-weight="700">Inject Sigs</text>
      <text x="185" y="65" text-anchor="middle" fill="white" font-size="10">into HTML</text>
      <text x="185" y="78" text-anchor="middle" fill="white" font-size="9">+ Audit Footer</text>

      <line x1="240" y1="57" x2="258" y2="57" stroke="#F97316" stroke-width="2" marker-end="url(#pf)"/>
      <rect x="260" y="30" width="110" height="55" rx="6" fill="#EA580C"/>
      <text x="315" y="52" text-anchor="middle" fill="white" font-size="10" font-weight="700">Python Svc</text>
      <text x="315" y="65" text-anchor="middle" fill="white" font-size="10">HTML → PDF</text>
      <text x="315" y="78" text-anchor="middle" fill="white" font-size="9">30s timeout, 2x retry</text>

      <line x1="370" y1="57" x2="388" y2="57" stroke="#F97316" stroke-width="2" marker-end="url(#pf)"/>
      <rect x="390" y="30" width="110" height="55" rx="6" fill="#C2410C"/>
      <text x="445" y="52" text-anchor="middle" fill="white" font-size="10" font-weight="700">SHA-256 Hash</text>
      <text x="445" y="65" text-anchor="middle" fill="white" font-size="10">PDF Buffer</text>
      <text x="445" y="78" text-anchor="middle" fill="white" font-size="9">Store hash in DB</text>

      <line x1="500" y1="57" x2="518" y2="57" stroke="#F97316" stroke-width="2" marker-end="url(#pf)"/>
      <rect x="520" y="30" width="110" height="55" rx="6" fill="#9A3412"/>
      <text x="575" y="52" text-anchor="middle" fill="white" font-size="10" font-weight="700">Upload to</text>
      <text x="575" y="65" text-anchor="middle" fill="white" font-size="10">Storage</text>
      <text x="575" y="78" text-anchor="middle" fill="white" font-size="9">S3 / Dropbox / GDrive</text>

      <line x1="630" y1="57" x2="648" y2="57" stroke="#F97316" stroke-width="2" marker-end="url(#pf)"/>
      <rect x="650" y="30" width="110" height="55" rx="6" fill="#64748B"/>
      <text x="705" y="52" text-anchor="middle" fill="white" font-size="10" font-weight="700">Post-Sign</text>
      <text x="705" y="65" text-anchor="middle" fill="white" font-size="10">Email / Notify</text>
      <text x="705" y="78" text-anchor="middle" fill="white" font-size="9">+ API Callback</text>

      <line x1="760" y1="57" x2="778" y2="57" stroke="#F97316" stroke-width="2" marker-end="url(#pf)"/>
      <rect x="780" y="30" width="110" height="55" rx="6" fill="#15803D"/>
      <text x="835" y="52" text-anchor="middle" fill="white" font-size="10" font-weight="700">Release Lock</text>
      <text x="835" y="65" text-anchor="middle" fill="white" font-size="10">Update Status</text>
      <text x="835" y="78" text-anchor="middle" fill="white" font-size="9">status=completed</text>

      <line x1="890" y1="57" x2="908" y2="57" stroke="#F97316" stroke-width="2" marker-end="url(#pf)"/>
      <rect x="910" y="30" width="60" height="55" rx="6" fill="#0F172A"/>
      <text x="940" y="52" text-anchor="middle" fill="white" font-size="10" font-weight="700">Audit</text>
      <text x="940" y="65" text-anchor="middle" fill="white" font-size="10">Log</text>
      <text x="940" y="78" text-anchor="middle" fill="#F97316" font-size="9">✓</text>
    </svg>
  </div>

  <h3>Document Schema</h3>
  <div class="schema"><pre>
<span class="sk">Document</span> {
  _id              : ObjectId
  template_id      : ObjectId
  template_snapshot: Object           <span class="sc">// full template config at creation — immutable</span>
  external_ref_id  : String           <span class="sc">// caller's reference (optional)</span>
  status           : <span class="st">"new" | "distributed" | "opened" | "partially_signed"
                   | "signed" | "rejected" | "expired" | "cancelled" | "completed"</span>
  payload_data     : Map&lt;String, any&gt; <span class="sc">// delimiter values from API call</span>
  html_rendered    : String           <span class="sc">// HTML with payload applied — snapshot, never regenerate</span>

  <span class="sk">recipients</span>: [{
    name, email, phone
    signature_order : Number
    status          : <span class="st">"pending" | "active" | "opened" | "signed" | "rejected"</span>
    token           : String          <span class="sc">// hashed JWT</span>
    current_token_jti: String         <span class="sc">// for revocation checking</span>
    token_expires_at: Date
    otp_verified    : Boolean
    signed_at       : Date
    signature_image : String          <span class="sc">// base64 PNG</span>
    ip_at_sign, user_agent_at_sign
    intent_confirmed: Boolean
    intent_text     : String
  }]

  pdf_url          : String           <span class="sc">// storage URL of final PDF</span>
  storage_path     : String
  pdf_hash         : String           <span class="sc">// SHA-256 hash</span>
  pdf_hash_algorithm: String          <span class="sc">// "SHA-256"</span>
  pdf_generated_at : Date

  expires_at       : Date             <span class="sc">// from template link_expiry</span>
  completed_at     : Date
  created_by       : String           <span class="sc">// "api" or user ObjectId</span>
  created_at, updated_at : Date
}
</pre></div>
</div>

<hr/>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- M6: MESSAGE CENTER -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="section" id="m6">
  <div class="section-head">
    <div class="s-num">M6</div>
    <h2>Message Center</h2>
    <span class="s-tag">TRACKING · HISTORY · ACTIONS</span>
  </div>
  <div class="mod-banner">
    <span class="mod-id">M6</span>
    <span class="mod-name">Message Center</span>
    <span class="mod-desc">Operational view into every sent document — real-time status, audit trail, resend, download, void actions.</span>
  </div>

  <h3>API Routes</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Method</th><th>Route</th><th>Action</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td><span class="badge b-get">GET</span></td><td>/api/company/messages</td><td>List all documents — server-side paginated DataTable</td><td>Filter: status, template, date range, recipient search</td></tr>
        <tr><td><span class="badge b-get">GET</span></td><td>/api/company/messages/:doc_id</td><td>Full document detail — recipients + event timeline</td><td>Used in detail drawer</td></tr>
        <tr><td><span class="badge b-get">GET</span></td><td>/api/company/messages/:doc_id/audit</td><td>Full audit trail for document (ordered by timestamp)</td><td>Pagination supported</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/company/messages/:doc_id/resend</td><td>Resend e-sign link to unsigned recipient(s)</td><td>Generates fresh token respecting original expiry</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/company/messages/:doc_id/cancel</td><td>Void/cancel document, notify signers</td><td>Only for non-completed docs</td></tr>
        <tr><td><span class="badge b-get">GET</span></td><td>/api/company/messages/:doc_id/download</td><td>Get signed PDF presigned URL</td><td>Only for completed docs</td></tr>
        <tr><td><span class="badge b-post">POST</span></td><td>/api/company/messages/:doc_id/remind</td><td>Send reminder to pending signers</td><td>Email/SMS via active provider</td></tr>
      </tbody>
    </table>
  </div>

  <div class="cards c2">
    <div class="card ob">
      <h4>📋 Main DataTable Columns</h4>
      <ul>
        <li>Document name, Template name</li>
        <li>Recipients (avatar stack with count)</li>
        <li>Status badge (color-coded per state)</li>
        <li>Sent date, Expires date</li>
        <li>Quick actions: Resend, Remind, Cancel, Download</li>
        <li>Bulk actions: Cancel selected, Download zip</li>
      </ul>
    </div>
    <div class="card ob">
      <h4>📊 Document Detail Drawer (right panel)</h4>
      <ul>
        <li><strong>Overview tab:</strong> status, timestamps, template ref</li>
        <li><strong>Recipients tab:</strong> per-signer status, signed_at, IP</li>
        <li><strong>Timeline tab:</strong> chronological event feed</li>
        <li><strong>Audit tab:</strong> full log table (IP, UA, geo, timestamps)</li>
        <li><strong>Preview tab:</strong> read-only HTML document view</li>
      </ul>
    </div>
  </div>
</div>

<hr/>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- M7: AUDIT LOG -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="section" id="m7">
  <div class="section-head">
    <div class="s-num">M7</div>
    <h2>Audit Log Module</h2>
    <span class="s-tag">COMPLIANCE · IMMUTABLE · LEGAL-GRADE</span>
  </div>
  <div class="mod-banner">
    <span class="mod-id">M7</span>
    <span class="mod-name">Audit & Compliance Log</span>
    <span class="mod-desc">Insert-only immutable event trail. Captures device, browser, geo context for every signer-side event. Legal-grade evidence.</span>
  </div>

  <h3>Audit Log Schema</h3>
  <div class="schema"><pre>
<span class="sk">AuditLog</span> {                                   <span class="sc">// INSERT ONLY — never update or delete</span>
  _id          : ObjectId
  document_id  : ObjectId
  event_type   : <span class="st">"document_created" | "link_sent" | "link_opened"
               | "otp_sent" | "otp_verified" | "otp_failed" | "otp_locked"
               | "signed" | "rejected" | "cancelled"
               | "pdf_generated" | "pdf_uploaded" | "pdf_hash_stored"
               | "email_sent" | "sms_sent" | "api_callback_triggered"
               | "link_resent" | "reminder_sent" | "token_rotated"
               | "signature_intent_confirmed"
               | "expired" | "status_changed"</span>

  actor_type   : <span class="st">"user" | "signer" | "system" | "api" | "cron"</span>
  actor_id     : String
  actor_name   : String
  actor_email  : String

  <span class="sc">// Captured for all signer-side events</span>
  ip_address   : String
  user_agent   : String
  geo          : { country, city, region, coordinates }

  <span class="sc">// Enhanced device context (from client headers)</span>
  device_type  : <span class="st">"mobile" | "tablet" | "desktop"</span>
  browser_name : String
  browser_version: String
  os           : String
  screen_resolution: String
  timezone     : String
  language     : String

  metadata     : Object          <span class="sc">// event-specific, e.g. { signer_index, pdf_hash, attempts }</span>
  timestamp    : Date            <span class="sc">// UTC, immutable</span>
}
</pre></div>

  <h3>All Audited Events</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Event Type</th><th>Trigger</th><th>Actor</th><th>Key Metadata</th></tr></thead>
      <tbody>
        <tr><td>document_created</td><td>API initiation</td><td>api/user</td><td>template_id, recipient count</td></tr>
        <tr><td>link_sent</td><td>Notification dispatched</td><td>system</td><td>to, channel, provider</td></tr>
        <tr><td>link_opened</td><td>Signer opens URL</td><td>signer</td><td>ip, device, geo</td></tr>
        <tr><td>otp_sent / otp_verified / otp_failed / otp_locked</td><td>MFA flow</td><td>signer</td><td>channel, attempts</td></tr>
        <tr><td>token_rotated</td><td>Post-OTP / resend / advance</td><td>system</td><td>old_jti, reason</td></tr>
        <tr><td>signature_intent_confirmed</td><td>Checkbox checked</td><td>signer</td><td>confirmation_text</td></tr>
        <tr><td>signed</td><td>Signature submitted</td><td>signer</td><td>signer_index, zone_id, ip</td></tr>
        <tr><td>rejected</td><td>Signer declines</td><td>signer</td><td>reason (if provided)</td></tr>
        <tr><td>pdf_generated / pdf_uploaded</td><td>Post-sign processing</td><td>system</td><td>pdf_hash, storage_path, file_size</td></tr>
        <tr><td>api_callback_triggered</td><td>Webhook execution</td><td>system</td><td>url, status_code, attempt</td></tr>
        <tr><td>expired / cancelled</td><td>Cron / API</td><td>cron/api</td><td>—</td></tr>
      </tbody>
    </table>
  </div>
</div>

<hr/>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- SECURITY ENHANCEMENTS -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="section" id="security">
  <div class="section-head">
    <div class="s-num dark">🔐</div>
    <h2>Security Enhancements</h2>
    <span class="s-tag">TOKEN · OTP · PDF · IDEMPOTENCY</span>
  </div>

  <h3>Security Architecture Overview</h3>
  <div class="diagram-wrap">
    <div class="diagram-title">Figure 9 — Security Layers</div>
    <svg viewBox="0 0 900 300" class="flow-svg" xmlns="http://www.w3.org/2000/svg">
      <!-- Concentric rings -->
      <ellipse cx="450" cy="150" rx="420" ry="135" fill="none" stroke="#FEF2F2" stroke-width="40" opacity="0.8"/>
      <ellipse cx="450" cy="150" rx="310" ry="100" fill="none" stroke="#FFF7ED" stroke-width="40" opacity="0.9"/>
      <ellipse cx="450" cy="150" rx="200" ry="65" fill="none" stroke="#FFEDD5" stroke-width="40"/>
      <ellipse cx="450" cy="150" rx="90" ry="36" fill="#F97316"/>
      <text x="450" y="154" text-anchor="middle" fill="white" font-size="12" font-weight="700">JWT + JTI</text>

      <!-- Layer labels -->
      <text x="450" y="215" text-anchor="middle" fill="#C2410C" font-size="11" font-weight="700">Token Rotation + Revocation</text>
      <text x="450" y="240" text-anchor="middle" fill="#EA580C" font-size="11" font-weight="700">OTP Throttling (5 attempts → 30min lock)</text>
      <text x="450" y="268" text-anchor="middle" fill="#DC2626" font-size="11" font-weight="700">Parallel Sign Lock · PDF Hash · API Idempotency</text>

      <!-- Callouts -->
      <rect x="10" y="30" width="150" height="60" rx="6" fill="white" stroke="#E2E8F0"/>
      <text x="85" y="50" text-anchor="middle" fill="#0F172A" font-size="10" font-weight="700">Token: jti + nonce</text>
      <text x="85" y="65" text-anchor="middle" fill="#64748B" font-size="9">Replay attack prevention</text>
      <text x="85" y="78" text-anchor="middle" fill="#64748B" font-size="9">Instant revocation</text>

      <rect x="740" y="30" width="150" height="60" rx="6" fill="white" stroke="#E2E8F0"/>
      <text x="815" y="50" text-anchor="middle" fill="#0F172A" font-size="10" font-weight="700">PDF: SHA-256 hash</text>
      <text x="815" y="65" text-anchor="middle" fill="#64748B" font-size="9">Tamper detection</text>
      <text x="815" y="78" text-anchor="middle" fill="#64748B" font-size="9">Stored + verified on demand</text>

      <rect x="10" y="210" width="150" height="60" rx="6" fill="white" stroke="#E2E8F0"/>
      <text x="85" y="230" text-anchor="middle" fill="#0F172A" font-size="10" font-weight="700">Concurrent Lock</text>
      <text x="85" y="245" text-anchor="middle" fill="#64748B" font-size="9">MongoDB unique index</text>
      <text x="85" y="258" text-anchor="middle" fill="#64748B" font-size="9">5min TTL auto-release</text>

      <rect x="740" y="210" width="150" height="60" rx="6" fill="white" stroke="#E2E8F0"/>
      <text x="815" y="230" text-anchor="middle" fill="#0F172A" font-size="10" font-weight="700">Idempotency Key</text>
      <text x="815" y="245" text-anchor="middle" fill="#64748B" font-size="9">24h TTL in Redis</text>
      <text x="815" y="258" text-anchor="middle" fill="#64748B" font-size="9">Request hash match</text>
    </svg>
  </div>

  <h3>Token Architecture</h3>
  <div class="code">
<span class="ck">interface</span> <span class="ct">ESignToken</span> {
  jti       : string;   <span class="cc">// Unique token ID — stored for revocation checks</span>
  doc_id    : string;
  signer_idx: number;
  company_id: string;
  issued_at : number;   <span class="cc">// Unix ms</span>
  expires_at: number;   <span class="cc">// 30min for signing sessions, full expiry for links</span>
  nonce     : string;   <span class="cc">// 16 random bytes — prevents prediction</span>
}

<span class="cc">// Token rotation trigger points:</span>
<span class="cc">// 1. OTP verified successfully</span>
<span class="cc">// 2. Link resent via Message Center</span>
<span class="cc">// 3. Sequential signer advances (after prior signs)</span>
<span class="cc">// 4. Security event (cancel, void)</span>
</div>

  <div class="cards c2">
    <div class="card ob">
      <h4>🔢 OTP Throttling</h4>
      <ul>
        <li>5 failed attempts → account locked 30 minutes</li>
        <li>Tracked per (document_id, recipient_email)</li>
        <li>OTPAttempt document auto-deletes after 24h (TTL index)</li>
        <li>Lock state audited: <code>otp_locked</code> event logged</li>
        <li>MFA channel fallback: SMS fails → try email (if enabled)</li>
      </ul>
    </div>
    <div class="card ob">
      <h4>🔒 Parallel Signing Lock</h4>
      <ul>
        <li>MongoDB unique index on document_id in DocumentLock collection</li>
        <li>5-minute TTL auto-releases stuck locks</li>
        <li>Duplicate key error → "try again in a moment" response</li>
        <li>Prevents: duplicate PDF generation, race-condition status corruption</li>
        <li>Both signature submission AND PDF generation use this lock</li>
      </ul>
    </div>
    <div class="card ob">
      <h4>#️⃣ PDF Hash Integrity</h4>
      <ul>
        <li>SHA-256 computed on PDF buffer after Python microservice returns</li>
        <li>Hash stored in Document.pdf_hash field</li>
        <li>Included in the audit footer embedded in the PDF itself</li>
        <li>Verification endpoint: POST /api/v1/esign/:doc_id/verify-pdf</li>
        <li>Hash mismatch → "PDF has been modified" response</li>
      </ul>
    </div>
    <div class="card ob">
      <h4>✅ Signature Intent</h4>
      <ul>
        <li>Required ☑ checkbox before final submission</li>
        <li>Confirmation text: "I confirm this is my legal signature"</li>
        <li>Server rejects submissions with intentConfirmed=false</li>
        <li>Logged as <code>signature_intent_confirmed</code> audit event</li>
        <li>Reduces repudiation claims in legal disputes</li>
      </ul>
    </div>
  </div>
</div>

<hr/>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- ERROR HANDLING -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="section" id="errors">
  <div class="section-head">
    <div class="s-num dark">⚠</div>
    <h2>Error Handling Strategy</h2>
    <span class="s-tag">CATEGORIES · CIRCUIT BREAKER · RETRY</span>
  </div>

  <div class="table-wrap">
    <table>
      <thead><tr><th>Error Category</th><th>Examples</th><th>Strategy</th><th>HTTP Code</th></tr></thead>
      <tbody>
        <tr><td><strong>Validation</strong></td><td>Missing required fields, invalid delimiter format, signer count mismatch</td><td>Fail-fast with detailed error array; never persist invalid state</td><td>400</td></tr>
        <tr><td><strong>Authentication</strong></td><td>Invalid token, expired link, wrong OTP, already signed, NOT_YOUR_TURN</td><td>Specific error codes returned; log every auth failure for security analysis</td><td>401/403</td></tr>
        <tr><td><strong>Provider Errors</strong></td><td>Email bounce, SMS failure, S3 upload error</td><td>Exponential backoff retry (3x, 1s/2s/4s); audit log on final failure</td><td>503</td></tr>
        <tr><td><strong>Workflow Errors</strong></td><td>Invalid status transition, out-of-order signing, lock contention</td><td>State machine validation before any update; lock TTL prevents deadlock</td><td>409</td></tr>
        <tr><td><strong>Integration Errors</strong></td><td>Python microservice timeout, API callback failure</td><td>Circuit breaker pattern; fallback to HTML storage if PDF fails</td><td>502</td></tr>
      </tbody>
    </table>
  </div>

  <div class="info g">
    <h4>Circuit Breaker — Python PDF Microservice</h4>
    <p>Threshold: 5 failures → open circuit for 60 seconds → half-open probe → reset on success. On open circuit, store HTML version as fallback and alert via audit log. Post-sign email still sent (without PDF attachment) to avoid blocking signers.</p>
  </div>

  <div class="info o">
    <h4>API Callback Retry</h4>
    <p>Webhook delivery uses exponential backoff: 3 attempts at 0s, 30s, 5min. Final failure is logged as <code>api_callback_failed</code> audit event with HTTP status and response body. Company can re-trigger via Message Center.</p>
  </div>

  <h3>Standard Error Response Format</h3>
  <div class="code">
<span class="cc">// All API errors return this consistent structure</span>
{
  <span class="cv">"error"</span>: {
    <span class="cv">"code"</span>    : <span class="cs">"LINK_EXPIRED"</span>,
    <span class="cv">"message"</span> : <span class="cs">"This signature link has expired"</span>,
    <span class="cv">"details"</span> : { <span class="cv">"expired_at"</span>: <span class="cs">"2024-06-01T10:00:00Z"</span> },
    <span class="cv">"timestamp"</span>: <span class="cs">"2024-06-02T09:00:00Z"</span>
  }
}

<span class="cc">// Error codes: INVALID_TOKEN | LINK_EXPIRED | TOKEN_REVOKED | ALREADY_SIGNED</span>
<span class="cc">//              NOT_YOUR_TURN | INVALID_OTP | OTP_LOCKED | OTP_EXPIRED</span>
<span class="cc">//              VALIDATION_ERROR | PROVIDER_NOT_CONFIGURED | DOCUMENT_LOCKED</span>
</div>
</div>

<hr/>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- CORRECTNESS PROPERTIES -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="section" id="props">
  <div class="section-head">
    <div class="s-num dark">#</div>
    <h2>Correctness Properties</h2>
    <span class="s-tag">35 PROPERTIES · PROPERTY-BASED TESTING</span>
  </div>

  <p>These 35 correctness properties define the universal behavioral guarantees of the system. Each must hold for all valid inputs across all executions. Property-based tests (fast-check, min 100 iterations each) verify these automatically on every PR.</p>

  <div class="props">
    <div class="prop"><div class="prop-num">P01</div><h5>Single Active Provider Per Type</h5><p>At most one storage, one email, one SMS provider has isActive=true per company at any time.</p><div class="prop-req">Validates: M1 Settings</div></div>
    <div class="prop"><div class="prop-num">P02</div><h5>Provider Validation Before Activation</h5><p>Credentials must be validated before isActive=true. Invalid credentials leave isActive=false.</p><div class="prop-req">Validates: M1 Settings</div></div>
    <div class="prop"><div class="prop-num">P03</div><h5>Configuration Round Trip</h5><p>save(config) then retrieve should return equivalent config with all fields preserved.</p><div class="prop-req">Validates: M1, M2, Settings</div></div>
    <div class="prop"><div class="prop-num">P04</div><h5>Delimiter Extraction + Replacement</h5><p>extractDelimiters() finds all {'{{}}'} tokens. replaceDelimiters() removes all when data provided.</p><div class="prop-req">Validates: M2 Template Engine</div></div>
    <div class="prop"><div class="prop-num">P05</div><h5>MFA OTP Generation + Validation</h5><p>Only correct OTP grants access. Wrong OTP increments attempts. Correct OTP clears attempts.</p><div class="prop-req">Validates: M4 Signer Page</div></div>
    <div class="prop"><div class="prop-num">P06</div><h5>Comprehensive Audit Logging</h5><p>Every tracked event produces an AuditLog entry with documentId, timestamp, eventType, and relevant metadata.</p><div class="prop-req">Validates: M7 Audit Log</div></div>
    <div class="prop"><div class="prop-num">P07</div><h5>Audit Event Field Completeness</h5><p>Signer events include IP + userAgent. PDF events include pdf_hash. Distribution events include recipient email.</p><div class="prop-req">Validates: M7 Audit Log</div></div>
    <div class="prop"><div class="prop-num">P08</div><h5>Notification on Configured Events</h5><p>When tracked event fires, notification sent via configured method to all specified recipients.</p><div class="prop-req">Validates: M5 Document Engine</div></div>
    <div class="prop"><div class="prop-num">P09</div><h5>API Callback Execution</h5><p>Configured trigger event fires → HTTP POST to callback URL with delimiters + custom properties.</p><div class="prop-req">Validates: M5, Template Config</div></div>
    <div class="prop"><div class="prop-num">P10</div><h5>Link Expiry Calculation + Enforcement</h5><p>Expiry = createdAt + template.link_expiry. Expired link access returns LINK_EXPIRED error.</p><div class="prop-req">Validates: M4, M3</div></div>
    <div class="prop"><div class="prop-num">P11</div><h5>Payload Schema Completeness</h5><p>Finalized payload includes all delimiters, all config options, in valid JSON format.</p><div class="prop-req">Validates: M2 Template Engine</div></div>
    <div class="prop"><div class="prop-num">P12</div><h5>API Request Validation</h5><p>Invalid company_id or template_id rejected with 400. Only valid combinations proceed.</p><div class="prop-req">Validates: M3 External API</div></div>
    <div class="prop"><div class="prop-num">P13</div><h5>Preview URL Conditionality</h5><p>preview_enabled=true → response includes previewURL. preview_enabled=false → direct distribution, no URL.</p><div class="prop-req">Validates: M3 External API</div></div>
    <div class="prop"><div class="prop-num">P14</div><h5>Preview Document Loading</h5><p>Valid preview URL → loads HTML with all delimiters replaced by provided data values.</p><div class="prop-req">Validates: M4 Preview</div></div>
    <div class="prop"><div class="prop-num">P15</div><h5>Send Button Triggers Distribution</h5><p>Clicking Send on preview generates unique links and initiates distribution to all recipients.</p><div class="prop-req">Validates: M4 Preview</div></div>
    <div class="prop"><div class="prop-num">P16</div><h5>Unique Document Identifiers</h5><p>All document IDs and recipient tokens are unique across the entire system for any set of documents.</p><div class="prop-req">Validates: M3, M5</div></div>
    <div class="prop"><div class="prop-num">P17</div><h5>Signature Type Link Activation</h5><p>single→1 active link, multiple→all active, hierarchy→only first active, send_to_all→all active independently.</p><div class="prop-req">Validates: M3, M5</div></div>
    <div class="prop"><div class="prop-num">P18</div><h5>Provider Used for Distribution</h5><p>Email → active email provider. SMS → active SMS provider. No active provider → distribution fails gracefully.</p><div class="prop-req">Validates: M3, M1</div></div>
    <div class="prop"><div class="prop-num">P19</div><h5>Sequential Signing Order Enforcement</h5><p>Only signer with status=active can sign. Out-of-order attempt returns NOT_YOUR_TURN. After sign → next activated + notified.</p><div class="prop-req">Validates: M4, M5</div></div>
    <div class="prop"><div class="prop-num">P20</div><h5>Signature Data Capture</h5><p>Every signature submission stores: image (base64), timestamp, IP address, user agent with the recipient record.</p><div class="prop-req">Validates: M4, M5</div></div>
    <div class="prop"><div class="prop-num">P21</div><h5>Document Completion Trigger</h5><p>Final required signature collected → status=signed → PDF generation + post-sign processing initiated.</p><div class="prop-req">Validates: M5</div></div>
    <div class="prop"><div class="prop-num">P22</div><h5>PDF Signature Injection</h5><p>PDF contains signature images at correct zone positions. Audit footer present. All signer metadata embedded.</p><div class="prop-req">Validates: M5 PDF Pipeline</div></div>
    <div class="prop"><div class="prop-num">P23</div><h5>Post-Sign Actions Execution</h5><p>All configured post-sign actions (storage, email, callback) execute on completion, each logged in audit.</p><div class="prop-req">Validates: M5</div></div>
    <div class="prop"><div class="prop-num">P24</div><h5>PDF Attachment Conditionality</h5><p>pdf_attachment=true → email includes PDF. pdf_attachment=false → no PDF in email.</p><div class="prop-req">Validates: M5 Post-Sign</div></div>
    <div class="prop"><div class="prop-num">P25</div><h5>Document Status Validity</h5><p>Status always in valid set. Transitions follow the defined state machine. No invalid transitions permitted.</p><div class="prop-req">Validates: M5</div></div>
    <div class="prop"><div class="prop-num">P26</div><h5>Template Update Round Trip</h5><p>Updating any template field then retrieving should reflect the updated value with other fields unchanged.</p><div class="prop-req">Validates: M2</div></div>
    <div class="prop"><div class="prop-num">P27</div><h5>Soft Delete Behavior</h5><p>Deleted template has isDeleted=true in DB. Not returned in normal listings. Blocks if active documents exist.</p><div class="prop-req">Validates: M2</div></div>
    <div class="prop"><div class="prop-num">P28</div><h5>Microservice Error Handling</h5><p>Python microservice error → logged, handled gracefully (fallback to HTML), appropriate error returned to caller.</p><div class="prop-req">Validates: M5 PDF Pipeline</div></div>
    <div class="prop"><div class="prop-num">P29</div><h5>Token Revocation Enforcement</h5><p>Any revoked token (rotation/cancel/security) → TOKEN_REVOKED error. JTI checked on every request.</p><div class="prop-req">Validates: Security</div></div>
    <div class="prop"><div class="prop-num">P30</div><h5>OTP Throttling Protection</h5><p>After 5 failed OTP attempts → signer locked 30 minutes → otp_locked audit event emitted.</p><div class="prop-req">Validates: Security</div></div>
    <div class="prop"><div class="prop-num">P31</div><h5>Parallel Signing Collision Prevention</h5><p>Concurrent signatures on same document → only one succeeds, other gets retry message. One PDF generated.</p><div class="prop-req">Validates: Security</div></div>
    <div class="prop"><div class="prop-num">P32</div><h5>PDF Hash Integrity</h5><p>SHA-256 hash stored. Verify endpoint: same PDF → match. Modified PDF → mismatch detected.</p><div class="prop-req">Validates: Security</div></div>
    <div class="prop"><div class="prop-num">P33</div><h5>API Idempotency</h5><p>Same Idempotency-Key + same payload → same response, no duplicate document created.</p><div class="prop-req">Validates: Security</div></div>
    <div class="prop"><div class="prop-num">P34</div><h5>Enhanced Audit Context Capture</h5><p>Signer events include device type, browser name, timezone, screen resolution, and geolocation.</p><div class="prop-req">Validates: M7, Security</div></div>
    <div class="prop"><div class="prop-num">P35</div><h5>Signature Intent Confirmation</h5><p>Submission with intentConfirmed=false is rejected. Confirmed intent logged as audit event.</p><div class="prop-req">Validates: Security</div></div>
  </div>
</div>

<hr/>

<!-- ══════════════════════════════════════════════════════════ -->
<!-- TESTING -->
<!-- ══════════════════════════════════════════════════════════ -->
<div class="section" id="testing">
  <div class="section-head">
    <div class="s-num dark">✓</div>
    <h2>Testing Strategy</h2>
    <span class="s-tag">UNIT · PROPERTY · INTEGRATION · E2E</span>
  </div>

  <div class="table-wrap">
    <table>
      <thead><tr><th>Layer</th><th>Tool</th><th>Coverage Target</th><th>When Runs</th></tr></thead>
      <tbody>
        <tr><td><strong>Unit Tests</strong></td><td>Jest + Supertest</td><td>≥ 80% code coverage</td><td>Every commit</td></tr>
        <tr><td><strong>Property Tests</strong></td><td>fast-check (min 100 iterations/property)</td><td>All 35 properties covered</td><td>Every PR</td></tr>
        <tr><td><strong>Integration Tests</strong></td><td>Jest + MongoDB memory server</td><td>All major workflows</td><td>Every PR</td></tr>
        <tr><td><strong>E2E Tests</strong></td><td>Playwright</td><td>Critical signer journeys</td><td>Pre-deployment</td></tr>
        <tr><td><strong>Load Tests</strong></td><td>k6</td><td>API response time under concurrent signers</td><td>Milestone releases</td></tr>
      </tbody>
    </table>
  </div>

  <h3>Property Test Tag Convention</h3>
  <div class="code">
<span class="cc">// Each property test follows this exact tagging convention:</span>
<span class="cc">// Feature: secure-gateway-esign-platform, Property {N}: {property_text}</span>

it(<span class="cs">'should have at most one active provider per type'</span>, () => {
  <span class="cc">// Feature: secure-gateway-esign-platform, Property 1: Single Active Provider Per Type</span>
  fc.assert(
    fc.property(providerConfigArbitrary, <span class="ck">async</span> (config) => {
      <span class="ck">await</span> settingsService.saveProviders(config);
      <span class="ck">const</span> saved = <span class="ck">await</span> settingsService.getProviders();
      <span class="ck">const</span> activeStorage = saved.storage.filter(p => p.isActive);
      expect(activeStorage.length).toBeLessThanOrEqual(<span class="cv">1</span>);
    }),
    { numRuns: <span class="cv">100</span> }
  );
});
</div>

  <h3>Recommended Build Order</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>#</th><th>Module</th><th>Reason</th><th>Priority</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>M1 — Settings (Storage + Email + SMS)</td><td>All other modules depend on provider configuration to send emails and store PDFs</td><td><span class="badge b-p0">P0 — Blocker</span></td></tr>
        <tr><td>2</td><td>M2 — Template Engine</td><td>Every document is driven by template config — nothing works without an active template</td><td><span class="badge b-p0">P0 — Blocker</span></td></tr>
        <tr><td>3</td><td>M3 — External API</td><td>Core entry point — creates documents, triggers the entire workflow</td><td><span class="badge b-p0">P0 — Core</span></td></tr>
        <tr><td>4</td><td>M4 — E-Sign Public Page</td><td>Signer experience — without this, generated URLs are dead ends</td><td><span class="badge b-p0">P0 — Core</span></td></tr>
        <tr><td>5</td><td>M5 — Document Engine + PDF Pipeline</td><td>Post-sign processing — PDF generation, storage, post-sign notifications</td><td><span class="badge b-p0">P0 — Core</span></td></tr>
        <tr><td>6</td><td>M7 — Audit Log</td><td>Wire in parallel with M3-M5; passive service call, not a blocker</td><td><span class="badge b-p1">P1 — Important</span></td></tr>
        <tr><td>7</td><td>M6 — Message Center</td><td>Operational visibility; depends on documents existing</td><td><span class="badge b-p1">P1 — Important</span></td></tr>
      </tbody>
    </table>
  </div>
</div>

</div><!-- end .page -->

<div class="doc-footer">
  <strong><span>Secure Gateway</span> E-Sign Platform — Design Document v2.0</strong><br/>
  Scope: Settings · Template Engine · External API · Signer Experience · Document Engine · Message Center · Audit Log · Security Model<br/>
  35 Correctness Properties · Property-Based + Unit + Integration + E2E Testing · MERN Stack + Python PDF Microservice<br/><br/>
  <span>Auth · Landing · Users · DB Infrastructure — Pre-implemented. This document covers Core Processing Modules only.</span>
</div>

</body>
</html>