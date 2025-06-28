export function formatCurrency(value: number, locale = 'en-US', currency = 'USD') {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
  
  export async function getBrowserCurrency() {
    try {
      const locale = navigator?.language || 'en-US';
      const region = new Intl.Locale(locale).region;
      
      // Map of region codes to their respective currencies
      const regionToCurrency: { [key: string]: string } = {
        'IN': 'INR',  // India
        'US': 'USD',  // United States
        'GB': 'GBP',  // United Kingdom
        'EU': 'EUR',  // European Union
        'JP': 'JPY',  // Japan
        'CA': 'CAD',  // Canada
        'AU': 'AUD',  // Australia
        'CN': 'CNY',  // China
        'BR': 'BRL',  // Brazil
        'RU': 'RUB',  // Russia
        'ZA': 'ZAR',  // South Africa
        'MX': 'MXN',  // Mexico
        'KR': 'KRW',  // South Korea
        'SG': 'SGD',  // Singapore
        'AE': 'AED',  // United Arab Emirates
      };
      
      const currency = region ? regionToCurrency[region] || 'USD' : 'USD';
      return { locale, currency };
    } catch {
      return { locale: 'en-US', currency: 'USD' };
    }
  }