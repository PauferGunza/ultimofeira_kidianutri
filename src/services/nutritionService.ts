import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "../lib/supabase";

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

export const analyzeImage = async (
  base64Image: string, 
  profile: any
): Promise<NutritionAnalysis> => {
  const isDev = window.location.hostname.includes('googleusercontent.com') || 
                window.location.hostname.includes('run.app') ||
                window.location.hostname === 'localhost' ||
                window.location.hostname.includes('ais-') ||
                window.location.hostname.includes('aisstudio');

  if (isDev) {
    const key = process.env.GEMINI_API_KEY || (process.env as any).KEY_API || '';
    const ai = new GoogleGenAI({ apiKey: key });
    
    const systemInstruction = `Analisa esta foto de comida ou planta angolana. 
    REGRA DE OURO: Conteúdo ultra-conciso. 
    Kidia Advice deve ser apenas uma frase curta (máx 15 palavras).
    Perfil: Diab: ${profile?.diabetes ? 'S' : 'N'}, Hiper: ${profile?.hypertension ? 'S' : 'N'}.`;

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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: "Análise nutricional e botânica Kidia. Retorne em JSON." }
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
      body: JSON.stringify({ base64Image, profile })
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
  userId: string,
  profile: any
): Promise<{ analysis: NutritionAnalysis; imageUrl: string }> => {
  // 1. Upload to Supabase Storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`; 

  const { error: uploadError } = await supabase.storage
    .from('meals')
    .upload(filePath, file);

  if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

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
  const analysis = await analyzeImage(base64Image, profile);

  return { analysis, imageUrl: publicUrl };
};

export const saveMealToHistory = async (userId: string, analysis: NutritionAnalysis, imageUrl: string) => {
  const { error: dbError } = await supabase.from('scan_history').insert([
    {
      user_id: userId,
      date: new Date().toISOString().split('T')[0],
      item_name: analysis.itemName,
      calories: analysis.calories,
      carbs: analysis.carbs,
      score_label: analysis.glycemicImpact,
      recommendation: analysis.kidiaAdvice,
      image_url: imageUrl,
      // Map other fields as needed or update DB schema
      metadata: {
        sodium: analysis.sodium,
        vitamins: analysis.vitamins,
        safetyAlert: analysis.safetyAlert
      }
    }
  ]);

  if (dbError) throw new Error(`Erro ao salvar no banco: ${dbError.message}`);
};
