export interface ChatMessage {
  role: 'user' | 'ia';
  content: string;
}

/**
 * Envia o histórico de mensagens para o assistente de nutrição no backend.
 * @param messages Array com o histórico da conversa
 * @returns A resposta da IA
 */
export const sendNutriMessage = async (messages: ChatMessage[]): Promise<string> => {
  try {
    const response = await fetch("/api/nutri-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Erro ao comunicar com o servidor");
    }

    const data = await response.json();
    return data.reply;
  } catch (error) {
    console.error("Erro no NutriService:", error);
    throw error;
  }
};
