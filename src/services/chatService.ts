import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export const sendMessageToAI = async (
  messages: ChatMessage[], 
  profile: any
): Promise<string> => {
  const isDev = window.location.hostname.includes('googleusercontent.com') || 
                window.location.hostname.includes('run.app') ||
                window.location.hostname === 'localhost' ||
                window.location.hostname.includes('ais-') ||
                window.location.hostname.includes('aisstudio');

  if (isDev) {
    const key = process.env.GEMINI_API_KEY || (process.env as any).KEY_API || '';
    const ai = new GoogleGenAI({ apiKey: key });
    
    const systemInstruction = `Tu és o Kidia, assistente de saúde em Angola. 
    REGRAS DE ECONOMIA DE TOKENS:
    1. Responde com o MÍNIMO de palavras possível.
    2. Proibido introduções, saudações ou textos educados desnecessários.
    3. Foca apenas na resposta técnica.
    4. Perfil: ${profile?.name || 'Amigo'}, Diab: ${profile?.diabetes ? 'S' : 'N'}, Hiper: ${profile?.hypertension ? 'S' : 'N'}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: messages.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      config: {
        systemInstruction
      }
    });

    return response.text;
  } else {
    // Production (Vercel)
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, profile })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro na conversa');
    }

    const data = await response.json();
    return data.text;
  }
};
