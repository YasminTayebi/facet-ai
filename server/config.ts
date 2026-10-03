import "dotenv/config";

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
};

export const config = {
  port: Number(process.env.PORT ?? 8787),
  hfToken: process.env.HF_TOKEN ?? "",
  hfModel: process.env.HF_MODEL ?? "openai/gpt-oss-120b:groq",
  hfBaseUrl: process.env.HF_BASE_URL ?? "https://router.huggingface.co/v1",
  allowDemoFallback: parseBoolean(process.env.ALLOW_DEMO_FALLBACK, true),
  dataFile: process.env.DATA_FILE ?? new URL("../data/profiles.json", import.meta.url).pathname,
};

