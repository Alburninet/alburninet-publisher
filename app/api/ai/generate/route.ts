// app/api/ai/generate/route.ts
import { NextRequest, NextResponse } from "next/server";

type Body = { topic?: string };

export async function GET() {
  // Apri /api/ai/generate nel browser: devi vedere JSON, non HTML
  return NextResponse.json({ ok: true, ping: "pong" }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const { topic } = ((await req.json().catch(() => ({}))) as Body) || {};
    if (!topic || !topic.trim()) {
      return NextResponse.json({ ok: false, error: "Inserisci un argomento." }, { status: 400 });
    }

    const apiKey = process.env.TOGETHER_API_KEY;
    const model = process.env.TOGETHER_MODEL || "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo";

    // MOCK se manca la chiave: il client riceve SEMPRE JSON (niente più HTML)
    if (!apiKey) {
      const fallback = {
        title: `Bozza: ${topic}`,
        seoTitle: `SEO: ${topic}`,
        excerpt:
          "Anteprima automatica (manca TOGETHER_API_KEY). Modifica questo testo per la meta description.",
        focusKw: topic.toLowerCase().split(" ").slice(0, 3).join(" "),
        tags: ["alburni", "news", "editoriale"],
        contentHtml: `<h2>${topic}</h2><p>Contenuto generato localmente. Aggiungi TOGETHER_API_KEY per usare Together AI.</p>`,
      };
      return NextResponse.json({ ok: true, data: fallback }, { status: 200 });
    }

    const systemPrompt = `
Sei un assistente editoriale in italiano ottimizzato per Yoast SEO.
Restituisci SOLO un JSON con: title, seoTitle, excerpt, focusKw, tags, contentHtml.
contentHtml: solo H2/H3, paragrafi, liste, 1–2 link esterni autorevoli. Nessun H1.
`.trim();

    const userPrompt = `
ARGOMENTO: ${topic.trim()}
Requisiti: Italiano, ≥3 H2, nessun H1, focus kw coerente, 1–2 link esterni in contentHtml.
Rispondi SOLO con un JSON conforme allo schema.
`.trim();

    const res = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
    });

    // Se il provider risponde HTML, ritorniamo comunque JSON
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `Risposta non-JSON dal provider (${res.status})`, detail: text.slice(0, 300) },
        { status: res.status || 502 }
      );
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";

    let parsed: any = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}$/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch {}
      }
    }
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json(
        { ok: false, error: "Risposta non in JSON valido", raw: content.slice(0, 300) },
        { status: 502 }
      );
    }

    const result = {
      title: String(parsed?.title || "").trim(),
      seoTitle: String(parsed?.seoTitle || parsed?.title || "").trim(),
      excerpt: String(parsed?.excerpt || "").trim(),
      focusKw: String(parsed?.focusKw || "").trim(),
      tags: Array.isArray(parsed?.tags) ? parsed.tags.slice(0, 12).map((t: any) => String(t)) : [],
      contentHtml: String(parsed?.contentHtml || ""),
    };

    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}