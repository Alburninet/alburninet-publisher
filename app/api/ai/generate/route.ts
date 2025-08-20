import { NextRequest, NextResponse } from "next/server";

type Body = { topic: string };

export async function POST(req: NextRequest) {
  try {
    const { topic } = (await req.json()) as Body;

    if (!topic || !topic.trim()) {
      return NextResponse.json(
        { ok: false, error: "Inserisci un argomento." },
        { status: 400 }
      );
    }

    if (!process.env.TOGETHER_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "Config mancante: TOGETHER_API_KEY" },
        { status: 500 }
      );
    }

    const model =
      process.env.TOGETHER_MODEL ||
      "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo";

    // Prompt di default: tono, stile, lunghezza, regole SEO/Yoast
    const systemPrompt = `
Sei un assistente editoriale professionale per un sito WordPress in lingua italiana.
Genera contenuti completi e ottimizzati per Yoast SEO seguendo queste regole:

TONO E STILE
- Tono: informativo e autorevole ma accessibile.
- Stile: chiaro, scorrevole, frasi brevi, voce attiva.
- Evita giri di parole e ripetizioni; usa esempi concreti quando utile.

STRUTTURA E SEO
- Lunghezza target: 900–1200 parole.
- NON inserire <h1> (lo gestiamo noi dal "title").
- Usa almeno 3 <h2> con sottosezioni <h3> dove sensato.
- Inserisci la focus keyword in modo naturale:
  - nel titolo (H1) → noi lo ricaveremo da "title"
  - in almeno un H2
  - nei primi paragrafi del contenuto
- Inserisci 1–2 link esterni autorevoli (no spam; rel="nofollow" solo se commerciale).
- Inserisci liste puntate/numerate quando utili.
- Leggibilità buona (obiettivo Gulpease ≥ 40).
- Non inventare dati/istituzioni specifiche.

OUTPUT
- Restituisci SOLO un JSON valido, senza testo aggiuntivo.
- Campi:
{
  "title": string,                 // Titolo articolo (H1): chiaro, con la keyword
  "seoTitle": string,              // opzionale: titolo ottimizzato per SERP; se assente usa "title"
  "excerpt": string,               // Meta description 120–160 caratteri, invogliante
  "focusKw": string,               // Focus keyphrase (italiano, minuscolo)
  "tags": string[],                // 4–8 tag corti, minuscoli, senza #, adatti a WordPress
  "contentHtml": string            // HTML con <h2>/<h3>, paragrafi, liste, e 1–2 link esterni
}
    `.trim();

    const userPrompt = `
ARGOMENTO: ${topic.trim()}

Requisiti:
- Italiano.
- Nessun <h1> nel contentHtml.
- Almeno 3 <h2>.
- Focus keyphrase coerente con l'argomento.
- 1–2 link esterni autorevoli (usa <a href="...">...) nel contentHtml.
- Nessun JSON aggiuntivo oltre allo schema richiesto.
`.trim();

    const res = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
      },
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

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { ok: false, error: `Together API error: ${res.status} ${text}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { ok: false, error: "Risposta vuota dal modello" },
        { status: 502 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Risposta non in JSON valido" },
        { status: 502 }
      );
    }

    const result = {
      title: (parsed?.title || "").toString().trim(),
      seoTitle: (parsed?.seoTitle || parsed?.title || "").toString().trim(),
      excerpt: (parsed?.excerpt || "").toString().trim(),
      focusKw: (parsed?.focusKw || "").toString().trim(),
      tags: Array.isArray(parsed?.tags)
        ? parsed.tags.slice(0, 12).map((t: any) => String(t))
        : [],
      contentHtml: (parsed?.contentHtml || "").toString(),
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}