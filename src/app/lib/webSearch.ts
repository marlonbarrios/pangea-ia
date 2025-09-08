// Web Search Tool for Pangea_IA agents
import { tool } from "@openai/agents/realtime";

export const webSearchTool = tool({
  name: "web_search",
  description: `Search the internet for current information, research, news, or any topic the user asks about. 
  Use this tool when:
  - The user asks about current events, news, or recent developments
  - Questions require up-to-date information not in your training data
  - User asks about specific companies, people, or technologies
  - Research questions about academic, scientific, or technical topics
  - User wants to verify facts or get current data
  - Questions about cultural events, politics, or social issues
  - Any query that would benefit from real-time web information
  
  Always explain to the user what you found and provide sources when possible.`,
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query to execute. Be specific and include relevant keywords."
      },
      explanation: {
        type: "string", 
        description: "Brief explanation of why this search is needed to answer the user's question."
      }
    },
    required: ["query", "explanation"]
  },
  execute: async ({ query, explanation }) => {
    try {
      console.log(`[webSearchTool] Executing search: "${query}" - ${explanation}`);
      
      const response = await fetch('/api/web-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, explanation })
      });

      if (!response.ok) {
        throw new Error(`Web search API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        return {
          success: false,
          error: data.error || "Search failed",
          message: data.results?.message || "No se pudo realizar la búsqueda web.",
          suggestions: data.results?.suggestions || []
        };
      }

      const results = data.results;
      
      // Format the search results for the agent
      let formattedResults = `Resultados de búsqueda web para: "${query}"\n\n`;
      
      if (results.instant_answer) {
        formattedResults += `📋 Respuesta directa: ${results.instant_answer}\n\n`;
      }
      
      if (results.definition) {
        formattedResults += `📖 Definición: ${results.definition}\n\n`;
      }
      
      if (results.infobox && results.infobox.content.length > 0) {
        formattedResults += `ℹ️ Información adicional:\n`;
        results.infobox.content.forEach((item: any) => {
          formattedResults += `• ${item.label}: ${item.value}\n`;
        });
        formattedResults += `\n`;
      }
      
      if (results.related_topics.length > 0) {
        formattedResults += `🔗 Temas relacionados:\n`;
        results.related_topics.forEach((topic: any, index: number) => {
          formattedResults += `${index + 1}. ${topic.text}\n   Fuente: ${topic.url}\n`;
        });
        formattedResults += `\n`;
      }
      
      if (results.external_links.length > 0) {
        formattedResults += `🌐 Enlaces externos:\n`;
        results.external_links.forEach((link: any, index: number) => {
          formattedResults += `${index + 1}. ${link.title}\n   URL: ${link.url}\n`;
        });
      }
      
      if (!results.instant_answer && !results.definition && results.related_topics.length === 0 && results.external_links.length === 0) {
        formattedResults += `⚠️ No se encontraron resultados específicos para "${query}". Intenta reformular la búsqueda o preguntar sobre temas más específicos.`;
      }

      console.log(`[webSearchTool] Search completed successfully`);
      
      return {
        success: true,
        query: query,
        results: formattedResults,
        timestamp: data.timestamp,
        raw_data: results // Include raw data for potential future use
      };
      
    } catch (error) {
      console.error('[webSearchTool] Error during web search:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `No se pudo realizar la búsqueda web para "${query}". ${error instanceof Error ? error.message : 'Error desconocido'}`,
        suggestions: [
          "Intenta reformular la pregunta",
          "Sé más específico en tu consulta", 
          "Pregunta sobre temas relacionados con Pangea_IA o IA decolonial"
        ]
      };
    }
  }
});

// Function to call web search (can be used by other parts of the application)
export async function callWebSearch(query: string, explanation: string = "User requested web search") {
  return await webSearchTool.execute({ query, explanation });
}
