import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "../lib/supabase";

export interface NutritionAnalysis {
  item_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  score: number;
  score_label: string;
  recommendation: string;
}

export const analyzeImage = async (base64Image: string): Promise<NutritionAnalysis> => {
  // Hybrid logic: In AI Studio preview, call from frontend.
  // In production (Vercel), call from backend.
  const isDev = window.location.hostname.includes('googleusercontent.com') || 
                window.location.hostname.includes('run.app') ||
                window.location.hostname === 'localhost' ||
                window.location.hostname.includes('ais-') ||
                window.location.hostname.includes('aisstudio');

  if (isDev) {
    const key = process.env.GEMINI_API_KEY || (process.env as any).KEY_API || '';
    const ai = new GoogleGenAI({ apiKey: key });
    
    const systemInstruction = `Analise esta imagem de uma refeição e forneça os detalhes nutricionais. 
    Seja o mais preciso possível para um guia de saúde em Angola.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        item_name: { type: Type.STRING, description: "Nome do item identificado" },
        calories: { type: Type.NUMBER, description: "Calorias estimadas" },
        protein: { type: Type.NUMBER, description: "Proteína em gramas" },
        carbs: { type: Type.NUMBER, description: "Carboidratos em gramas" },
        fat: { type: Type.NUMBER, description: "Gordura em gramas" },
        fiber: { type: Type.NUMBER, description: "Fibra em gramas" },
        score: { type: Type.NUMBER, description: "Pontuação de 0 a 100" },
        score_label: { type: Type.STRING, description: "Rótulo da pontuação (Saudável, Moderado, Atenção)" },
        recommendation: { type: Type.STRING, description: "Uma frase curta de conselho" }
      },
      required: ["item_name", "calories", "protein", "carbs", "fat", "fiber", "score", "score_label", "recommendation"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Analise esta imagem nutricionalmente. Retorne em JSON." }
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
    // Production (Vercel): Use secure backend route
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Falha na análise da IA');
    }

    return response.json();
  }
};

export const uploadAndAnalyze = async (
  file: File, 
  userId: string
): Promise<{ analysis: NutritionAnalysis; imageUrl: string }> => {
  // 1. Upload to Supabase Storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`; // Uploading to bucket root

  const { error: uploadError } = await supabase.storage
    .from('meals')
    .upload(filePath, file);

  if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}. Certifica-te que o bucket 'meals' existe.`);

  // Get Public URL
  const { data: { publicUrl } } = supabase.storage.from('meals').getPublicUrl(filePath);

  // 2. Convert to Base64 for Gemini
  const base64Promise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
  const base64Image = await base64Promise;

  // 3. Analyze with Gemini
  const analysis = await analyzeImage(base64Image);

  return { analysis, imageUrl: publicUrl };
};

export const saveMealToHistory = async (userId: string, analysis: NutritionAnalysis, imageUrl: string) => {
  const { error: dbError } = await supabase.from('scan_history').insert([
    {
      user_id: userId,
      date: new Date().toISOString().split('T')[0],
      item_name: analysis.item_name,
      calories: analysis.calories,
      protein: analysis.protein,
      carbs: analysis.carbs,
      fat: analysis.fat,
      fiber: analysis.fiber,
      score: analysis.score,
      score_label: analysis.score_label,
      recommendation: analysis.recommendation,
      image_url: imageUrl
    }
  ]);

  if (dbError) throw new Error(`Erro ao salvar no banco: ${dbError.message}`);
};
