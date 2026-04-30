import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "../lib/supabase";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
  const model = "gemini-3-flash-preview";
  
  const prompt = `Analise esta imagem de uma refeição e forneça os detalhes nutricionais em formato JSON. 
  Seja o mais preciso possível para um guia de saúde em Angola.
  Retorne um objeto com os campos: item_name (texto), calories (número), protein (número em g), carbs (número em g), fat (número em g), fiber (número em g), score (0-100), score_label (ex: Saudável, Moderado, Atenção), recommendation (uma frase curta de conselho).`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/jpeg", data: base64Image } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          item_name: { type: Type.STRING },
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
          fiber: { type: Type.NUMBER },
          score: { type: Type.NUMBER },
          score_label: { type: Type.STRING },
          recommendation: { type: Type.STRING }
        },
        required: ["item_name", "calories", "protein", "carbs", "fat", "fiber", "score", "score_label", "recommendation"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const uploadAndAnalyze = async (
  file: File, 
  userId: string
): Promise<{ analysis: NutritionAnalysis; imageUrl: string }> => {
  // 1. Upload to Supabase Storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Math.random()}.${fileExt}`;
  const filePath = `meals/${fileName}`;

  const { error: uploadError, data } = await supabase.storage
    .from('meals')
    .upload(filePath, file);

  if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

  // Get Public URL
  const { data: { publicUrl } } = supabase.storage.from('meals').getPublicUrl(filePath);

  // 2. Convert to Base64 for Gemini
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
  const base64Image = await base64Promise;

  // 3. Analyze with Gemini
  const analysis = await analyzeImage(base64Image);

  // 4. Save to scan_history
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
      image_url: publicUrl
    }
  ]);

  if (dbError) throw new Error(`Erro ao salvar no banco: ${dbError.message}`);

  return { analysis, imageUrl: publicUrl };
};
