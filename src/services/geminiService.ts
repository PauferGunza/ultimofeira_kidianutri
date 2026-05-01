import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, ScanResult } from "../../types";
export type { ScanResult };
import { supabase } from "../lib/supabase";

const getApiKey = () => process.env.GEMINI_API_KEY || process.env.API_KEY || (process.env as any).KEY_API || '';

// --- CHAT SERVICE ---
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export const sendMessageToAI = async (messages: ChatMessage[], profile: UserProfile): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = `Tu és o Kidia, um assistente virtual de saúde altamente profissional em Angola.
    REGRAS CRÍTICAS DE ECONOMIA:
    1. Responde com o MÍNIMO de palavras possível.
    2. Proibido saudações, introduções ou "Como posso ajudar".
    3. Foca apenas em factos técnicos e nutrição local.
    4. Se uma palavra basta, não uses duas.
    5. Perfil: ${profile?.name || 'Amigo'}, Diabético: ${profile?.diabetes ? 'Sim' : 'Não'}, Hipertenso: ${profile?.hypertension ? 'Sim' : 'Não'}, Peso: ${profile?.weightLoss ? 'Perder' : 'Manter'}.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }]
    })),
    config: { systemInstruction }
  });
  return response.text;
};

// --- NUTRITION SERVICE ---
export const analyzeImage = async (
  base64Data: string,
  mimeType: string,
  profile: UserProfile
): Promise<ScanResult> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `Analisa esta foto de comida ou planta angolana. 
    REGRA DE OURO: Conteúdo ultra-conciso. 
    Kidia Advice deve ser apenas uma frase curta (máx 15 palavras).
    Perfil: Diab: ${profile?.diabetes ? 'S' : 'N'}, Hiper: ${profile?.hypertension ? 'S' : 'N'}, Peso: ${profile?.weightLoss ? 'P' : 'M'}.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      itemName: { type: Type.STRING, description: "Nome do item identificado" },
      isFood: { type: Type.BOOLEAN, description: "Verdadeiro se for comida/prato, falso se for planta medicinal ou outro" },
      calories: { type: Type.STRING, description: "Ex: '350 kcal' ou 'N/A'" },
      glycemicImpact: { type: Type.STRING, description: "DEVE SER EXATAMENTE UM DESTES: 'Baixo', 'Médio', 'Alto', ou 'N/A'" },
      carbs: { type: Type.STRING, description: "Ex: '45g' ou 'N/A'" },
      sodium: { type: Type.STRING, description: "Ex: '150mg' ou 'N/A'" },
      vitamins: { type: Type.STRING, description: "Principais vitaminas/minerais presentes" },
      kidiaAdvice: { type: Type.STRING, description: "Conselho integrativo e cultural da Kidia" },
      safetyAlert: { type: Type.STRING, description: "Aviso de segurança personalizado. Vazio se não houver perigo." }
    },
    required: ["itemName", "isFood", "calories", "glycemicImpact", "carbs", "sodium", "vitamins", "kidiaAdvice", "safetyAlert"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: "Análise nutricional e botânica Kidia. Retorne em JSON.",
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2,
      },
    });

    const result = JSON.parse(response.text) as ScanResult;
    return result;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Não foi possível analisar a imagem. Tente novamente.");
  }
};

export const uploadAndAnalyze = async (
  file: File, 
  userId: string,
  profile: UserProfile
): Promise<{ analysis: ScanResult; imageUrl: string }> => {
  const fileName = `${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('meals')
    .upload(fileName, file);

  if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage.from('meals').getPublicUrl(fileName);

  const base64Promise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  const base64Image = await base64Promise;

  const analysis = await analyzeImage(base64Image, file.type, profile);
  return { analysis, imageUrl: publicUrl };
};

export const saveMealToHistory = async (userId: string, analysis: ScanResult, imageUrl: string) => {
  const { error } = await supabase.from('scan_history').insert([
    {
      user_id: userId,
      date: new Date().toISOString().split('T')[0],
      item_name: analysis.itemName,
      calories: parseInt(analysis.calories) || 0,
      carbs: parseInt(analysis.carbs) || 0,
      score_label: analysis.glycemicImpact,
      recommendation: analysis.kidiaAdvice,
      image_url: imageUrl,
      metadata: {
        isFood: analysis.isFood,
        sodium: analysis.sodium,
        vitamins: analysis.vitamins,
        safetyAlert: analysis.safetyAlert
      }
    }
  ]);
  if (error) throw error;
};
