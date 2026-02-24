import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { MockupRequest } from "../types";

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey });
};

const parseBase64 = (base64String: string) => {
  const match = base64String.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  // Fallback if it's already just the base64 data
  return { mimeType: "image/png", data: base64String };
};

export const generateMockup = async (request: MockupRequest): Promise<string> => {
  const ai = getAI();
  const { logoBase64, productType, prompt, color } = request;

  const basePrompt = `Create a high-quality, professional product mockup of a ${color || 'white'} ${productType}. 
  The uploaded image is a logo. Please place this logo naturally on the ${productType}. 
  Ensure the lighting, shadows, and texture of the logo match the fabric or material of the ${productType}.
  The background should be a clean, minimalist studio setting or a lifestyle context appropriate for ${productType}.
  ${prompt ? `Additional instructions: ${prompt}` : ''}`;

  const { mimeType, data } = parseBase64(logoBase64);
  const logoPart = {
    inlineData: {
      mimeType,
      data,
    },
  };

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        logoPart,
        { text: basePrompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      }
    }
  });

  let imageUrl = "";
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }

  if (!imageUrl) {
    throw new Error("Failed to generate mockup image");
  }

  return imageUrl;
};

export const editMockup = async (
  currentMockupBase64: string,
  logoBase64: string,
  instruction: string
): Promise<string> => {
  const ai = getAI();

  const prompt = `Here is a current mockup and the original logo. 
  Please modify the mockup according to this instruction: "${instruction}".
  Maintain the logo placement but apply the requested changes (e.g., change product color, change background, add a filter).`;

  const mockupData = parseBase64(currentMockupBase64);
  const logoData = parseBase64(logoBase64);

  const mockupPart = {
    inlineData: {
      mimeType: mockupData.mimeType,
      data: mockupData.data,
    },
  };

  const logoPart = {
    inlineData: {
      mimeType: logoData.mimeType,
      data: logoData.data,
    },
  };

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        mockupPart,
        logoPart,
        { text: prompt }
      ]
    },
  });

  let imageUrl = "";
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }

  if (!imageUrl) {
    throw new Error("Failed to edit mockup image");
  }

  return imageUrl;
};
