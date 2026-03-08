const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function callWithRetry(prompt, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      if (err.message && err.message.includes('429') && i < maxRetries - 1) {
        console.log(`[Gemini] Rate limited, retrying in ${(i + 1) * 3}s...`);
        await new Promise(r => setTimeout(r, (i + 1) * 3000));
      } else {
        throw err;
      }
    }
  }
}

exports.generateFollowUpQuestions = async (language = 'en') => {

  const languageInstruction = language === 'en'
    ? 'Write the questions in English.'
    : `Write the questions in the language with code "${language}". For example if the code is "zh" write in Chinese, "ms" in Malay, "ta" in Tamil, etc. The questions MUST be in that language, not English.`;

  const prompt = `You are an emergency triage assistant for elderly callers.

Ask 3 very simple questions to determine if the situation is:

URGENT - Immediate danger to life or health (e.g., severe bleeding, unconsciousness, chest pain)
OR
NON-URGENT - No immediate danger, but still requires attention (e.g., minor fall, mild pain)

${languageInstruction}

Return only the questions, one per line.`;

  const result = await callWithRetry(prompt);
  return result;
};

exports.summarizeIntervention = async (questions, answers) => {
  const qaPairs = questions.map((q, i) => `Q: ${q}\nA: ${answers[i] || 'No answer provided'}`).join('\n\n');

  const prompt = `You are an emergency triage assistant. Based on the following questions and the elderly caller's answers, provide:

1. A brief SUMMARY of the situation (in English, even if the Q&A is in another language)
2. An URGENCY assessment: URGENT, NON-URGENT, or UNCERTAIN
3. RECOMMENDED ACTIONS (2-3 bullet points, in English)

The questions and answers may be in any language. Understand them regardless of language.

Questions and Answers:
${qaPairs}

Respond in this exact JSON format only, no markdown:
{
  "summary": "...",
  "urgency": "URGENT" | "NON-URGENT" | "UNCERTAIN",
  "recommendedActions": ["...", "..."]
}`;

  const text = await callWithRetry(prompt);
  // Strip markdown code fences and any leading/trailing whitespace
  const cleaned = text.replace(/```(?:json)?\n?/g, '').replace(/\n?```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[Gemini] Failed to parse JSON:', cleaned);
    // Attempt to extract JSON object from the text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw e;
  }
};