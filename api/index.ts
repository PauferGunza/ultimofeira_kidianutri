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
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Mensagens inválidas' });

    const ai = getAI();
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada na Vercel. Por favor, adiciona-a nas configurações do projeto.' });
    }

    const systemInstruction = `Tu és o Kidia Nutri AI, um assistente virtual de nutrição especializado na saúde e culinária de Angola. 
    REGRAS: Sê extremamente direto, conciso e prático. Responde em poucas palavras sempre que possível, focando em ingredientes locais de Angola. Sem textos longos ou enrolação.`;

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
    
    res.json({ text: result.text });
  } catch (error: any) {
    console.error('Erro no Chat IA:', error);
    res.status(500).json({ error: error.message || 'Erro no chat do servidor' });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) return res.status(400).json({ error: 'Falta a imagem' });

    const ai = getAI();
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada na Vercel.' });
    }

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

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Analise esta imagem nutricionalmente. Retorne em JSON." }
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
