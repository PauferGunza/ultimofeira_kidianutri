import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// AI Service logic on the server
const getAI = () => {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key || key === 'AI Studio Free Tier' || key.includes('MY_GEMINI_API_KEY')) {
    throw new Error('GEMINI_API_KEY inválida. Adiciona uma chave real (AI Studio) no painel da Vercel.');
  }
  return new GoogleGenAI({ apiKey: key });
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.NODE_ENV });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Mensagens inválidas' });

    const ai = getAI();
    const systemPrompt = `Tu és o Kidia Nutri AI, um assistente virtual de nutrição especializado na saúde e culinária de Angola. 
    REGRAS: Sê extremamente direto, conciso e prático. Responde em poucas palavras sempre que possível, focando em ingredientes locais de Angola. Sem textos longos ou enrolação.`;

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...messages.map((m: any) => ({
        role: m.role,
        parts: [{ text: m.content }]
      }))
    ];

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents
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
    const prompt = `Analise esta imagem de uma refeição e forneça os detalhes nutricionais em formato JSON. 
    Seja o mais preciso possível para um guia de saúde em Angola.
    Retorne um objeto com os campos: item_name (texto), calories (número), protein (número em g), carbs (número em g), fat (número em g), fiber (número em g), score (0-100), score_label (ex: Saudável, Moderado, Atenção), recommendation (uma frase curta de conselho).`;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
        ]
      }],
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = result.text;
    // Clean potential markdown code blocks if the model includes them
    const cleanedJson = responseText.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(cleanedJson));
  } catch (error: any) {
    console.error('Erro na análise IA:', error);
    res.status(500).json({ error: error.message || 'Erro ao analisar imagem no servidor' });
  }
});

// For development only
if (process.env.NODE_ENV !== "production") {
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
