import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get input (CLI arg, file, or stdin)
async function getInput() {
  const arg = process.argv[2];

  // If file path provided
  if (arg && fs.existsSync(arg)) {
    return fs.readFileSync(arg, "utf-8");
  }

  // If direct text provided
  if (arg) {
    return process.argv.slice(2).join(" ");
  }

  // If piped input
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", chunk => data += chunk);
    process.stdin.on("end", () => resolve(data.trim()));
  });
}

async function summarize(text) {
  if (!text || text.trim() === "") {
    console.error("❌ No input provided.");
    process.exit(1);
  }

  try {
    console.log("⏳ Processing...\n");

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You extract structured summaries from text."
        },
        {
          role: "user",
          content: `

Return ONLY valid JSON:

{
  "summary": "...",
  "key_points": ["...", "...", "..."],
  "sentiment": "..."
}

Text:
${text}
`
        }
      ],
    });

    const raw = response.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("⚠️ JSON parse failed. Raw output:\n", raw);
      return;
    }

    console.log("=== Structured Summary ===\n");
    console.log("Summary:", parsed.summary);

    console.log("\nKey Points:");
    parsed.key_points.forEach((point, i) => {
      console.log(`${i + 1}. ${point}`);
    });

    console.log("\nSentiment:", parsed.sentiment);

  } catch (error) {
    console.error("❌ API Error:", error.message);
  }
}

(async () => {
  const input = await getInput();
  await summarize(input);
})();
