import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    const partNumber = req.query.partNumber;
    if (!partNumber) return res.status(400).json({ error: "partNumber missing" });

    const q = encodeURIComponent(partNumber);

    const googleURL =
      `https://www.googleapis.com/customsearch/v1?q=${q}` +
      `&cx=${process.env.GOOGLE_CX}` +
      `&key=${process.env.GOOGLE_API_KEY}` +
      `&gl=tr&lr=lang_tr&cr=countryTR`;

    const googleRes = await fetch(googleURL);
    const googleData = await googleRes.json();
    const items = googleData.items || [];

    let titles = [];
    let models = new Set();
    let supers = new Set();
    let images = new Set();
    let notes = [];

    for (const item of items.slice(0, 3)) {
      if (!item.link) continue;

      try {
        const html = await (await fetch(item.link)).text();
        const $ = cheerio.load(html);

        const t = $("h1").first().text().trim() || $("title").first().text().trim();
        if (t) titles.push(t);

        const bodyText = $("body").text();

        const modelMatch = bodyText.match(/W[0-9]{3}/g);
        if (modelMatch) modelMatch.forEach(m => models.add(m));

        const supersMatch = bodyText.match(/A[0-9]{6,}/g);
        if (supersMatch) supersMatch.forEach(s => supers.add(s));

        $("img").each((i, e) => {
          const src = $(e).attr("src");
          if (!src) return;
          const link = src.startsWith("http") ? src : new URL(src, item.link).href;
          images.add(link);
        });

        const desc = $("meta[name='description']").attr("content");
        if (desc) notes.push(desc);
      } catch (e) {
        console.log("Scrape error:", e);
      }
    }

    const summaryPrompt = `
Bu Mercedes parça bilgilerini özetle, temizle ve Türkçeye çevir:

Başlıklar:
${titles.join("\n")}

Modeller:
${[...models].join(", ")}

Değişen Numaralar:
${[...supers].join(", ")}

Açıklamalar:
${notes.join("\n")}
`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: summaryPrompt }]
      })
    });

    const aiData = await aiRes.json();
    const summary = aiData.choices?.[0]?.message?.content || "";

    return res.status(200).json({
      title: titles[0] || `Parça Bilgisi (${partNumber})`,
      models: [...models],
      supersessions: [...supers],
      images: [...images].slice(0, 4),
      notes: summary
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
