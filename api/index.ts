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
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

app.post('/api/analyze', async (req, res) => {
  try {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: 'Falta a imagem' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor' });
    }

    const prompt = `Analise esta imagem de uma refeição e forneça os detalhes nutricionais em formato JSON. 
    Seja o mais preciso possível para um guia de saúde em Angola.
    Retorne um objeto com os campos: item_name (texto), calories (número), protein (número em g), carbs (número em g), fat (número em g), fiber (número em g), score (0-100), score_label (ex: Saudável, Moderado, Atenção), recommendation (uma frase curta de conselho).`;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
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

    res.json(JSON.parse(result.text));
  } catch (error: any) {
    console.error('Erro na análise IA:', error);
    res.status(500).json({ error: error.message || 'Erro interno ao analisar imagem' });
  }
});

// Vite middleware for development
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
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

export default app;
