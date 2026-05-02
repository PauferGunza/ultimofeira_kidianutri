import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API Route for NutriAI Chat
app.post("/api/nutri-chat", async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Histórico de mensagens é obrigatório" });
    }

    const apiKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
    if (!apiKey) {
      return res.status(500).json({ error: "Configuração do servidor incompleta (API Key não encontrada)" });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const systemInstruction = `És a NutriAI, uma nutricionista moderna, empática e altamente profissional que fala português de Angola.
      O teu objetivo é ajudar as pessoas a terem uma alimentação saudável e equilibrada.

      DOMÍNIOS DE ATUAÇÃO:
      - Emagrecimento saudável e sustentável.
      - Ganho de massa muscular (hipertrofia).
      - Dietas económicas adaptadas à realidade de Angola (usando funge, peixe fresco, mandioca, bombó, kisaca, frutas tropicais).
      - Nutrição preventiva (diabetes, hipertensão).

      REGRAS DE OURO:
      1. Linguagem: Usa português de Angola claro, acolhedor e direto.
      2. Contexto Local: Sugere sempre alimentos acessíveis nos mercados locais (Roque Santeiro, Catinton, etc. - metaforicamente, focando na disponibilidade real).
      3. Pratos Típicos: Valoriza a gastronomia angolana, ensinando a tornar pratos como Mufete ou Calulu mais equilibrados.
      4. Restrições: Se a pergunta for médica ou envolver patologias graves, sugere sempre a consulta com um médico presencial.
      5. Formatação: Usa listas e negrito para facilitar a leitura no telemóvel.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: messages.map(m => ({
        role: m.role === 'ia' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      config: {
        systemInstruction,
        maxOutputTokens: 800,
        temperature: 0.7,
      }
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error("Erro na API NutriChat:", error);
    res.status(500).json({ reply: "Tive um problema técnico. Podes repetir a pergunta?" });
  }
});

// Vite middleware setup
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor a correr em http://localhost:${PORT}`);
});
