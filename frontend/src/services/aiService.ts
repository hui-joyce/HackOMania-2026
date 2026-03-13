const API_BASE = `${import.meta.env.VITE_API_URL}/ai`;

export async function getAIIntervention(caseId: string) {
  try {
    const res = await fetch(`${API_BASE}/intervene/${encodeURIComponent(caseId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function startAIIntervention(caseId: string, language?: string) {
  try {
    const res = await fetch(`${API_BASE}/intervene/${encodeURIComponent(caseId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: language || "en" }),
    });

    if (!res.ok) {
      throw new Error("Failed to start AI intervention");
    }

    return await res.json();
  } catch (err) {
    console.error("AI intervention error:", err);
    throw err;
  }
}

export async function transcribeAnswer(questionIndex: number, audioData: number[]) {
  const res = await fetch(`${API_BASE}/transcribe-answer/${questionIndex}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio: audioData }),
  });

  if (!res.ok) {
    throw new Error("Failed to transcribe answer");
  }

  return await res.json();
}

export async function submitAIAnswers(caseId: string, questions: string[], answers: string[]) {
  try {
    const res = await fetch(`${API_BASE}/intervene/${encodeURIComponent(caseId)}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions, answers }),
    });

    if (!res.ok) {
      throw new Error("Failed to submit answers");
    }

    return await res.json();
  } catch (err) {
    console.error("Submit answers error:", err);
    throw err;
  }
}