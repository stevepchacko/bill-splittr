import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(request: NextRequest) {
  try {
    console.log('AI Parse API - Request received');
    
    const requestBody = await request.json();
    console.log('AI Parse API - Request body:', requestBody);
    
    const { ocrResults } = requestBody;
    console.log('AI Parse API - Extracted ocrResults:', ocrResults);
    console.log('AI Parse API - ocrResults type:', typeof ocrResults);
    console.log('AI Parse API - ocrResults isArray:', Array.isArray(ocrResults));
    
    if (!ocrResults || !Array.isArray(ocrResults)) {
      console.error('AI Parse API - Invalid OCR results:', ocrResults);
      return NextResponse.json({ error: 'Invalid OCR results' }, { status: 400 });
    }

    // Cloudflare Workers AI endpoint
    const accountId = process.env.WORKERS_AI_ACCOUNT_ID || '';
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`;
    
    console.log('AI Parse API - Account ID:', accountId);
    console.log('AI Parse API - Full URL:', url);
    
    // Combine all OCR text into a single string
    const ocrText = ocrResults.join(' ');
    
    // System prompt to guide the AI
    const systemPrompt = `You are a bill parsing assistant. Extract bill items and extra charges from a receipt that has already passed through an OCR model.

Your task is to:
1. Identify the bill name/restaurant name if present
2. Extract individual bill items with name, price, and quantity
3. Identify any extra charges (tax, tip, service fee, etc.) and determine if they are fixed amounts or percentages

You MUST return ONLY a valid JSON object with this EXACT structure:
{"billName":"Restaurant Name" or null,"items":[{"name":"Item Name","price":"12.99","quantity":"1"}],"extraCharges":[{"name":"Tax","value":"8.5","type":"percentage"}], "confidence": 0.95, "total": "100.00"}

Rules:
- If quantity is not specified, add null and reduce the confidence score
- Prices should be extracted from the OCR text, if prices are not numbers then reduce the confidence score
- Extra charges should be categorized as either 'amount' (fixed dollar amount) or 'percentage' (tax rates, tip percentages)
- Do not return any extra text like emails or other information, explanations, formatting — only valid minified JSON

CRITICAL REQUIREMENTS:
- Make sure that the individual amounts + extra charges add up to the total amount on the receipt, if not reduce the confidence score by a high margin
- Return ONLY the JSON object, no other text
- Include "items" array (even if empty: [])
- Include "extraCharges" array (even if empty: [])
- Include only numbers when extracting prices, if "price" is not a proper decimal number, return a null and also reduce the confidence score
- Use "amount" for fixed dollar amounts, "percentage" for rates, as the "type" field in extraCharges
- If no items found, return empty arrays: {"billName":null,"items":[],"extraCharges":[]}`;

    // User prompt with the OCR text
    const userPrompt = `Please parse this receipt text and extract the bill information:

${ocrText}`;

    // Make API call to Cloudflare Workers AI
    const apiToken = process.env.WORKERS_AI_API_TOKEN || '';
    if (!apiToken) {
      console.error('AI Parse API - Missing CLOUDFLARE_API_TOKEN environment variable');
      return NextResponse.json({ error: 'Missing API token configuration' }, { status: 500 });
    }
    
    console.log('AI Parse API - Making request to Cloudflare AI');
    console.log('AI Parse API - URL:', url);
    console.log('AI Parse API - OCR Text length:', ocrText.length);
    
    const aiRequestBody = {
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ]
    };
    
    console.log('AI Parse API - Request body:', JSON.stringify(aiRequestBody, null, 2));
    console.log('AI Parse API - Authorization header:', `Bearer ${apiToken.substring(0, 10)}...`);
    
    // Make streaming API call to Cloudflare Workers AI
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(aiRequestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Parse API - Cloudflare API error response:', errorText);
      console.error('AI Parse API - Response status:', response.status);
      console.error('AI Parse API - Response headers:', Object.fromEntries(response.headers.entries()));
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    // Handle streaming response
    if (!response.body) {
      throw new Error('No response body received from Cloudflare AI');
    }

    console.log('AI Parse API - Starting to read streaming response...');
    
    // Read the streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        console.log('AI Parse API - Received chunk:', chunk);
      }
    } finally {
      reader.releaseLock();
    }
    
    console.log('AI Parse API - Full streaming response:', fullResponse);
    
    // Try to extract JSON from the streaming response
    let aiResponse = fullResponse;
    
    console.log('AI Parse API - Full response structure:', fullResponse);
    
    // First, try to parse the full response as a Cloudflare API response
    try {
      const cloudflareResponse = JSON.parse(fullResponse);
      console.log('AI Parse API - Parsed Cloudflare response:', cloudflareResponse);
      
      // Extract the AI's actual response from the Cloudflare wrapper
      if (cloudflareResponse.result && cloudflareResponse.result.response) {
        aiResponse = cloudflareResponse.result.response;
        console.log('AI Parse API - Extracted AI response from Cloudflare wrapper:', aiResponse);
      } else if (cloudflareResponse.response) {
        aiResponse = cloudflareResponse.response;
        console.log('AI Parse API - Extracted AI response from response field:', aiResponse);
      }
    } catch (parseError) {
      console.log('AI Parse API - Not a Cloudflare API response, treating as direct AI response');
    }
    
    // If we still don't have the AI response, try to extract JSON from the text
    if (!aiResponse || aiResponse === fullResponse) {
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = jsonMatch[0];
        console.log('AI Parse API - Extracted JSON from text match:', aiResponse);
      }
    }
    
    // Also try to find JSON if it's not wrapped in other text
    if (!aiResponse || aiResponse === fullResponse) {
      if (fullResponse.trim().startsWith('{')) {
        aiResponse = fullResponse.trim();
        console.log('AI Parse API - Using full response as JSON:', aiResponse);
      }
    }

    // Try to parse the JSON response
    let parsedData: ParsedBillData;
    try {
      // Clean up the response and try to parse as JSON
      const cleanedResponse = aiResponse.trim();
      console.log('AI Parse API - Attempting to parse cleaned response:', cleanedResponse);
      
      parsedData = JSON.parse(cleanedResponse);
      console.log('AI Parse API - Successfully parsed JSON:', parsedData);
      
      // Log the structure for debugging
      console.log('AI Parse API - Parsed data structure:', {
        hasBillName: !!parsedData.billName,
        itemsCount: parsedData.items?.length || 0,
        extraChargesCount: parsedData.extraCharges?.length || 0,
        itemsType: typeof parsedData.items,
        extraChargesType: typeof parsedData.extraCharges
      });
      
      // Additional validation - check if we have the expected structure
      if (!parsedData.items && !parsedData.extraCharges) {
        console.log('AI Parse API - Warning: Response missing both items and extraCharges');
        console.log('AI Parse API - Available keys:', Object.keys(parsedData));
      }
      
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw AI response:', aiResponse);
      console.log('Cleaned response:', aiResponse.trim());
      throw new Error('AI returned invalid JSON format');
    }

    // Validate and fix the parsed data structure
    console.log('AI Parse API - Validating parsed data structure...');
    
    // Ensure items array exists and is valid
    if (!parsedData.items) {
      console.log('AI Parse API - No items found, creating empty array');
      parsedData.items = [];
    } else if (!Array.isArray(parsedData.items)) {
      console.log('AI Parse API - Items is not an array, converting to array');
      parsedData.items = [parsedData.items];
    }
    
    // Ensure extraCharges array exists and is valid
    if (!parsedData.extraCharges) {
      console.log('AI Parse API - No extraCharges found, creating empty array');
      parsedData.extraCharges = [];
    } else if (!Array.isArray(parsedData.extraCharges)) {
      console.log('AI Parse API - ExtraCharges is not an array, converting to array');
      parsedData.extraCharges = [parsedData.extraCharges];
    }
    
    // Check confidence score
    if (parsedData.confidence !== undefined && parsedData.confidence < 0.9) {
      console.log('AI Parse API - Confidence too low:', parsedData.confidence);
      throw new Error('OCR data could not be read clearly. Please try taking a clearer photo or enter the bill details manually.');
    }
    
    // Validate that we have at least some data
    if (parsedData.items.length === 0 && parsedData.extraCharges.length === 0) {
      console.log('AI Parse API - Warning: No items or extra charges found in response');
      console.log('AI Parse API - Full parsed data:', parsedData);
    }
    
    console.log('AI Parse API - Final validated data:', {
      billName: parsedData.billName,
      itemsCount: parsedData.items.length,
      extraChargesCount: parsedData.extraCharges.length,
      confidence: parsedData.confidence,
      total: parsedData.total
    });

    return NextResponse.json(parsedData);
    
  } catch (error) {
    console.error('AI parsing error:', error);
    return NextResponse.json(
      { error: 'AI parsing failed' }, 
      { status: 500 }
    );
  }
}
