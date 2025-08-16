import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // OCR-API endpoint
    const url = 'https://api.ocr.space/parse/image';
    
    // Create form data for OCR-API
    const ocrFormData = new FormData();
    ocrFormData.append('apikey', process.env.OCR_SPACE_KEY || '');
    ocrFormData.append('language', 'eng');
    ocrFormData.append('isOverlayRequired', 'true');
    ocrFormData.append('file', file);
    
    // Make API call to OCR-API
    const response = await fetch(url, {
      method: 'POST',
      body: ocrFormData,
    });
    
    if (!response.ok) {
      throw new Error(`OCR API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.IsErroredOnProcessing) {
      throw new Error(`OCR processing error: ${data.ErrorMessage}`);
    }
    
    // Parse results - extract just the text strings
    const results: string[] = [];
    
    if (data.ParsedResults && data.ParsedResults.length > 0) {
      const parsedResult = data.ParsedResults[0];
      
      if (parsedResult.TextOverlay && parsedResult.TextOverlay.Lines) {
        parsedResult.TextOverlay.Lines.forEach((line: { Words: { WordText: string }[] }) => {
          line.Words.forEach((word: { WordText: string }) => {
            results.push(word.WordText);
          });
        });
      }
    }
    
    return NextResponse.json({ results });
    
  } catch (error) {
    console.error('OCR processing error:', error);
    return NextResponse.json(
      { error: 'OCR processing failed' }, 
      { status: 500 }
    );
  }
}
