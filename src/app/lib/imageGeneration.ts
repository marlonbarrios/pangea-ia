// Image generation utility for Pangea_IA agents

export interface ImageGenerationParams {
  prompt: string;
  style?: 'decolonial' | 'speculative_cartography' | 'artificial_ecology' | 'cultural_memory' | 'general';
  size?: '1024x1024' | '1024x1792' | '1792x1024';
}

export interface ImageGenerationResult {
  imageUrl: string;
  revisedPrompt: string;
  originalPrompt: string;
  enhancedPrompt: string;
  success: boolean;
  error?: string;
}

import { tool } from '@openai/agents/realtime';

export const generateImageTool = tool({
  name: "generate_image",
  description: `Generate images using DALL-E 3 with decolonial and artistic enhancements. 
  
This tool is perfect for creating:
- Decolonial art and visualizations
- Speculative cartographies and alternative maps  
- Artificial ecology and multispecies imagery
- Cultural memory and embodied knowledge representations
- Indigenous-inspired patterns and aesthetics
- Global South perspectives and epistemologies

Use this when the user explicitly requests an image, visualization, or artistic representation.`,
  
  parameters: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "Detailed description of the image to generate. Be specific about visual elements, style, and mood."
      },
      style: {
        type: "string",
        enum: ["decolonial", "speculative_cartography", "artificial_ecology", "cultural_memory", "general"],
        description: "Artistic style to apply. Choose based on the context: 'decolonial' for indigenous/Global South aesthetics, 'speculative_cartography' for alternative maps, 'artificial_ecology' for multispecies AI, 'cultural_memory' for embodied knowledge, 'general' for other requests."
      },
      size: {
        type: "string",
        enum: ["1024x1024", "1024x1792", "1792x1024"],
        description: "Image dimensions. Square (1024x1024) for general use, portrait (1024x1792) for vertical compositions, landscape (1792x1024) for horizontal compositions."
      }
    },
    required: ["prompt"],
    additionalProperties: false
  },
  
  execute: async (params: ImageGenerationParams) => {
    const result = await callImageGeneration({
      prompt: params.prompt,
      style: params.style || 'decolonial',
      size: params.size || '1024x1024'
    });
    
    if (result.success) {
      return {
        success: true,
        imageUrl: result.imageUrl,
        revisedPrompt: result.revisedPrompt,
        originalPrompt: result.originalPrompt,
        enhancedPrompt: result.enhancedPrompt,
        message: `Image generated successfully! I created: "${result.revisedPrompt}"`
      };
    } else {
      return {
        success: false,
        error: result.error,
        message: `I apologize, but I encountered an error generating the image: ${result.error}`
      };
    }
  }
});

export async function callImageGeneration(params: ImageGenerationParams): Promise<ImageGenerationResult> {
  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: params.prompt,
        style: params.style || 'decolonial',
        size: params.size || '1024x1024'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        imageUrl: '',
        revisedPrompt: '',
        originalPrompt: params.prompt,
        enhancedPrompt: '',
        success: false,
        error: errorData.error || 'Failed to generate image'
      };
    }

    const data = await response.json();
    
    return {
      imageUrl: data.imageUrl,
      revisedPrompt: data.revisedPrompt,
      originalPrompt: data.originalPrompt,
      enhancedPrompt: data.enhancedPrompt,
      success: true
    };

  } catch (error) {
    console.error('Image generation client error:', error);
    return {
      imageUrl: '',
      revisedPrompt: '',
      originalPrompt: params.prompt,
      enhancedPrompt: '',
      success: false,
      error: 'Network error during image generation'
    };
  }
}
