import { supabase } from "../lib/supabase";
import { NutritionAnalysis, analyzeImage } from "./geminiService";

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
