import Exa from "exa-js";

/**
 * Fetches company site content and summary using Exa (exa-js).
 * @param url The company website URL
 * @returns {Promise<{ title: string; summary: string; cleaned_content: string; url: string; exaRaw: any; }>}
 */
export async function getCompanySummaryFromExa(url: string) {
  const summaryPrompt =
    "Summarize the following company website. Your summary should be concise, objective, and written for a business analyst audience. Focus on:  1. What does the company do? (core product/service, business model) 2. Who are its customers and markets? 3. What are its main strengths and weaknesses? 4. Any recent news, strategic moves, or notable trends? If content doesn't exist, leave it out of the summar.";

  const apiKey = process.env.EXA_API_KEY;
  const exa = new Exa(apiKey);

  // Log request details


  try {
    const requestOptions = {
      text: {}, // Exa SDK expects true or an object, {} is safest
      summary: { query: summaryPrompt },
      subpages: 2,
      subpageTarget: "about, mission, team, careers, leadership"
    };
    const response = await exa.getContents([
      url
    ], requestOptions);
    // Log response

    const result = response?.results?.[0] || {};

    let summary = "";
if (typeof result.summary === "string") {
  summary = result.summary;
} else if (result.summary && typeof result.summary === "object" && "summary" in result.summary) {
  summary = (result.summary as { summary?: string }).summary || "";
}

return {
  title: result.title || url,
  summary,
  cleaned_content: result.text || "",
  url: result.url || url,
  exaRaw: result
};
  } catch (err) {
    console.error('[ExaAgent] Error in getCompanySummaryFromExa:', err);
    throw err;
  }
}
