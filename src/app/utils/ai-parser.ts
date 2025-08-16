export interface ParsedBillItem {
  name: string;
  price: string;
  quantity: string;
}

export interface ParsedExtraCharge {
  name: string;
  value: string;
  type: 'amount' | 'percentage';
}

export interface ParsedBillData {
  billName?: string;
  items: ParsedBillItem[];
  extraCharges: ParsedExtraCharge[];
  confidence?: number;
  total?: string;
}

export async function parseBillWithAI(ocrResults: string[]): Promise<ParsedBillData> {
  try {
    console.log('AI Parser - Input ocrResults:', ocrResults);
    console.log('AI Parser - Input type:', typeof ocrResults);
    console.log('AI Parser - Input length:', ocrResults?.length);
    
    // Call our serverless function
    const requestBody = { ocrResults };
    console.log('AI Parser - Request body:', requestBody);
    
    const response = await fetch('/api/ai-parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('AI Parser - Response status:', response.status);
    console.log('AI Parser - Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Parser - Error response:', errorText);
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('AI Parser - Response data:', data);
    
    if (data.error) {
      throw new Error(data.error);
    }

    return data;

  } catch (error) {
    console.error('AI parsing error:', error);
    throw error;
  }
}
