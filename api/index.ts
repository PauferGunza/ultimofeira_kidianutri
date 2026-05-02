import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// AI Service logic on the server
const getAI = () => {
  const primaryKey = process.env.GEMINI_API_KEY || '';
  const altKey = process.env.KEY_API || '';
  
  const isValid = (k: string) => k && k !== 'AI Studio Free Tier' && !k.includes('MY_GEMINI_API_KEY') && k.length > 5;
  
  if (isValid(primaryKey)) return new GoogleGenAI({ apiKey: primaryKey });
  if (isValid(altKey)) return new GoogleGenAI({ apiKey: altKey });
  
  return null;
};

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    environment: process.env.NODE_ENV, 
    hasGeminiKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'AI Studio Free Tier',
    hasAltKey: !!process.env.KEY_API
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, profile } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Mensagens inválidas' });

    const ai = getAI();
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada na Vercel.' });
    }

    const systemInstruction = `Tu és o Kidia, um assistente virtual de saúde altamente profissional em Angola.
        REGRAS CRÍTICAS DE ECONOMIA:
        1. Responde com o MÍNIMO de palavras possível.
        2. Proibido saudações, introduções ou "Como posso ajudar".
        3. Foca apenas em factos técnicos e nutrição local.
        4. Se uma palavra basta, não uses duas.
        5. Perfil: ${profile?.name || 'Amigo'}, Diabético: ${profile?.diabetes ? 'Sim' : 'Não'}, Hipertenso: ${profile?.hypertension ? 'Sim' : 'Não'}, Peso: ${profile?.weightLoss ? 'Perder' : 'Manter'}.`;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: messages.map((m: any) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      config: {
        systemInstruction
      }
    });
    
    res.json({ reply: result.text });
  } catch (error: any) {
    console.error('Erro no Chat IA:', error);
    res.status(500).json({ error: error.message || 'Erro no chat do servidor' });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { base64Data, mimeType, profile } = req.body;
    if (!base64Data) return res.status(400).json({ error: 'Falta a imagem' });

    const ai = getAI();
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada na Vercel.' });
    }

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

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Data } },
          { text: "Análise nutricional e botânica Kidia. Retorne em JSON." }
        ]
      }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema
      }
    });

    res.json(JSON.parse(result.text));
  } catch (error: any) {
    console.error('Erro na análise IA:', error);
    res.status(500).json({ error: error.message || 'Erro ao analisar imagem no servidor' });
  }
});

// For development only
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running local on http://localhost:${PORT}`);
  });
}

export default app;
