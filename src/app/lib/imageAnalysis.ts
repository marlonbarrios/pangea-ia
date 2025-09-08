// Image analysis utility for Pangea_IA agents

import { tool } from '@openai/agents/realtime';

export interface ImageAnalysisParams {
  imageData: string; // base64 data URL
  analysisType?: 'general' | 'decolonial' | 'artistic' | 'technical' | 'cultural' | 'custom';
  customPrompt?: string;
}

export interface ImageAnalysisResult {
  analysis: string;
  analysisType: string;
  fileName?: string;
  success: boolean;
  error?: string;
}

export const analyzeImageTool = tool({
  name: "analyze_image",
  description: `Analyze uploaded images using GPT-4 Vision with decolonial and cultural perspectives.
  
This tool is perfect for analyzing:
- Artistic works and visual culture
- Colonial vs. decolonial representations
- Cultural symbols and meanings
- Technical image characteristics
- Social and political content in images
- Indigenous and Global South perspectives in visual media

Use this when users upload an image or when you need to analyze visual content from a decolonial perspective.`,
  
  parameters: {
    type: "object",
    properties: {
      imageData: {
        type: "string",
        description: "Base64 encoded image data URL (data:image/...;base64,...)"
      },
      analysisType: {
        type: "string",
        enum: ["general", "decolonial", "artistic", "technical", "cultural", "custom"],
        description: "Type of analysis to perform. 'decolonial' for colonial/decolonial analysis, 'artistic' for aesthetic analysis, 'cultural' for cultural context, 'technical' for technical description, 'general' for comprehensive analysis."
      },
      customPrompt: {
        type: "string",
        description: "Custom analysis prompt when analysisType is 'custom'"
      }
    },
    required: ["imageData"],
    additionalProperties: false
  },
  
  execute: async (params: ImageAnalysisParams) => {
    try {
      const formData = new FormData();
      
      // Convert base64 data URL to blob
      const response = await fetch(params.imageData);
      const blob = await response.blob();
      const file = new File([blob], "uploaded-image.png", { type: blob.type });
      
      formData.append('image', file);
      formData.append('analysisType', params.analysisType || 'general');
      if (params.customPrompt) {
        formData.append('customPrompt', params.customPrompt);
      }

      const apiResponse = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        return {
          analysis: '',
          analysisType: params.analysisType || 'general',
          success: false,
          error: errorData.error || 'Failed to analyze image'
        };
      }

      const result = await apiResponse.json();
      
      return {
        analysis: result.analysis,
        analysisType: result.analysisType,
        fileName: result.fileName,
        success: true
      };

    } catch (error) {
      console.error('Image analysis tool error:', error);
      return {
        analysis: '',
        analysisType: params.analysisType || 'general',
        success: false,
        error: 'Network error during image analysis'
      };
    }
  }
});

export async function callImageAnalysis(params: ImageAnalysisParams): Promise<ImageAnalysisResult> {
  try {
    const formData = new FormData();
    
    // Convert base64 data URL to blob
    const response = await fetch(params.imageData);
    const blob = await response.blob();
    const file = new File([blob], "uploaded-image", { type: blob.type });
    
    formData.append('image', file);
    formData.append('analysisType', params.analysisType || 'general');
    if (params.customPrompt) {
      formData.append('customPrompt', params.customPrompt);
    }

    const apiResponse = await fetch('/api/analyze-image', {
      method: 'POST',
      body: formData,
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      return {
        analysis: '',
        analysisType: params.analysisType || 'general',
        success: false,
        error: errorData.error || 'Failed to analyze image'
      };
    }

    const result = await apiResponse.json();
    
    return {
      analysis: result.analysis,
      analysisType: result.analysisType,
      fileName: result.fileName,
      success: true
    };

  } catch (error) {
    console.error('Image analysis client error:', error);
    return {
      analysis: '',
      analysisType: params.analysisType || 'general',
      success: false,
      error: 'Network error during image analysis'
    };
  }
}
