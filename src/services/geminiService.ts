import { GoogleGenAI, Type } from "@google/genai";

// Tipos baseados na tua estrutura
export interface NutritionAnalysis {
  itemName: string;
  isFood: boolean;
  calories: string;
  glycemicImpact: string;
  carbs: string;
  sodium: string;
  vitamins: string;
  kidiaAdvice: string;
  safetyAlert: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

// Helper para verificar ambiente
const isDev = window.location.hostname.includes('googleusercontent.com') || 
              window.location.hostname.includes('run.app') ||
              window.location.hostname === 'localhost';

const getApiKey = () => process.env.GEMINI_API_KEY || (process.env as any).KEY_API || '';

// --- CHAT SERVICE ---
export const sendMessageToAI = async (messages: ChatMessage[], profile: any): Promise<string> => {
  if (isDev) {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const systemInstruction = `Tu és o Kidia, assistente de saúde em Angola. 
    REGRAS DE ECONOMIA: Responde com o MÍNIMO de palavras. Sem saudações. 
    Perfil: ${profile?.name || 'Amigo'}, Diab: ${profile?.diabetes ? 'S' : 'N'}, Hiper: ${profile?.hypertension ? 'S' : 'N'}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      })),
      config: { systemInstruction }
    });
    return response.text;
  } else {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, profile })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.reply;
  }
};

// --- NUTRITION SERVICE (ANALYZE) ---
export const analyzeImage = async (base64Image: string, profile: any): Promise<NutritionAnalysis> => {
  if (isDev) {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const systemInstruction = `Analisa esta foto de comida ou planta angolana. 
    REGRA DE OURO: Conteúdo ultra-conciso. Kidia Advice máx 15 palavras.
    Perfil: Diab: ${profile?.diabetes ? 'S' : 'N'}, Hiper: ${profile?.hypertension ? 'S' : 'N'}.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        itemName: { type: Type.STRING, description: "Nome do item identificado" },
        isFood: { type: Type.BOOLEAN, description: "Verdadeiro se for comida" },
        calories: { type: Type.STRING, description: "Ex: '350 kcal' ou 'N/A'" },
        glycemicImpact: { type: Type.STRING, description: "Baixo, Médio, Alto, ou N/A" },
        carbs: { type: Type.STRING, description: "Ex: '45g' ou 'N/A'" },
        sodium: { type: Type.STRING, description: "Ex: '150mg' ou 'N/A'" },
        vitamins: { type: Type.STRING, description: "Principais vitaminas" },
        kidiaAdvice: { type: Type.STRING, description: "Concelho curto máx 15 palavras" },
        safetyAlert: { type: Type.STRING, description: "Aviso se houver perigo, senão vazio" }
      },
      required: ["itemName", "isFood", "calories", "glycemicImpact", "carbs", "sodium", "vitamins", "kidiaAdvice", "safetyAlert"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Análise nutricional Kidia. JSON." }
        ]
      }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      }
    });

    return JSON.parse(response.text);
  } else {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image, profile })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  }
};
