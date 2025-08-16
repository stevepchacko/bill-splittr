# Vercel Deployment Setup

## Environment Variables

Set these environment variables in your Vercel dashboard:

### 1. Go to Vercel Dashboard
1. Navigate to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to **Settings** → **Environment Variables**

### 2. Add Environment Variables

#### OCR-API Key
```
Name: OCR_API_KEY
Value: your_ocr_api_key_here
Environment: Production, Preview, Development
```

#### Cloudflare API Token
```
Name: CLOUDFLARE_API_TOKEN
Value: your_cloudflare_api_token_here
Environment: Production, Preview, Development
```

#### Cloudflare Account ID
```
Name: CLOUDFLARE_ACCOUNT_ID
Value: c5383129581a09015b74daca5fa808ed
Environment: Production, Preview, Development
```

## Security Benefits

✅ **API keys are now secure** - stored server-side only  
✅ **No client-side exposure** - keys never sent to browser  
✅ **Vercel handles encryption** - automatic security  
✅ **Environment-specific** - different keys per environment  

## How It Works Now

1. **Frontend** → Calls `/api/ocr` and `/api/ai-parse`
2. **Serverless Functions** → Make API calls with secure keys
3. **Response** → Returns parsed data to frontend
4. **Security** → API keys never leave Vercel's servers

## Testing

After setting environment variables:
1. **Deploy** to Vercel
2. **Test** photo upload functionality
3. **Check logs** in Vercel dashboard for any errors
4. **Verify** OCR and AI parsing work correctly

## Local Development

For local development, create a `.env.local` file:
```bash
OCR_API_KEY=your_key_here
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=ctestaccountidhereed
```
