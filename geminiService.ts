import { GoogleGenAI, Type } from "@google/genai";

/**
 * Technical HS/Calisthenics Assistant using Gemini 3 Flash.
 * Focuses on surgical technical cues for calisthenics.
 */
export async function getTechnicalAdvice(query: string, currentExercise?: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Athlete asks: "${query}"${currentExercise ? ` while focusing on ${currentExercise}` : ""}.`,
      config: {
        systemInstruction: `You are the AI Technical Assistant for Ilai Shimony Elite Coaching. 
        Expertise: Handstand (HS), Press to HS, Planche, and Weighted Calisthenics. 
        Provide short, surgical technical cues (max 35 words). 
        Key cues: "Scapular protraction", "Claw the floor", "Posterior Pelvic Tilt (PPT)", "Ribs down", "Hollow body", "External rotation of shoulders". 
        Tone: Professional, intense, focused on physics and alignment. Use anatomical terms.`
      }
    });
    return response.text || "Focus on your line. Re-attempt protocol.";
  } catch (e) {
    console.error("Gemini Error:", e);
    return "Execute with precision. Keep the ribs tucked.";
  }
}

/**
 * Provides an instant technical correction based on the feeling of the previous set.
 * Specifically for the HS Lab mini-app.
 */
export async function getSetCorrection(skill: string, feeling: string, holdTime: number) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Skill: ${skill}. Result: ${holdTime}s hold. Athlete Feeling: "${feeling}". Provide 1 immediate technical cue for the next set.`,
      config: {
        systemInstruction: `You are Ilai Shimony's Technical AI Coach. 
        You give ultra-specific, 1-sentence cues based on handstand feelings.
        - 'overbalance': Focus on knuckle pressure.
        - 'underbalance': Open shoulder angle more.
        - 'closed shoulders': Push harder through the base.
        - 'loose core': Squeeze glutes and rib-tuck.
        Keep it under 15 words.`
      }
    });
    return response.text || "Maintain hollow body tension.";
  } catch (e) {
    console.error("Gemini Error:", e);
    return "Push the floor away and stay tight.";
  }
}

/**
 * Suggests exercise progressions based on specific HS goals.
 */
export async function suggestExerciseProgression(exerciseName: string, goal: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Athlete is doing: "${exerciseName}". Ultimate Goal: "${goal}". Suggest 3 high-leverage progressions.`,
      config: {
        systemInstruction: `You are an elite calisthenics programmer. Focus on joint health and structural balance. Use terminology like 'eccentric loading', 'isometric holds', and 'volume accumulation'.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["level", "description"]
              }
            }
          },
          required: ["steps"]
        }
      }
    });

    return response.text ? JSON.parse(response.text) : null;
  } catch (e) {
    console.error("Progression logic error:", e);
    return null;
  }
}