export interface OCRResult {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export async function processImageWithOCR(file: File): Promise<string[]> {
  try {
    // Create form data for our API route
    const formData = new FormData();
    formData.append('file', file);
    
    // Call our serverless function
    const response = await fetch('/api/ocr', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`OCR API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.results || [];
    
  } catch (error) {
    console.error('OCR processing error:', error);
    throw error;
  }
}


