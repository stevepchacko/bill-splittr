import { Currency, currencies } from '../utils/currencies';

interface CurrencySelectorProps {
  selectedCurrency: string;
  onCurrencyChange: (currency: string, locale: string) => void;
}

export default function CurrencySelector({ selectedCurrency, onCurrencyChange }: CurrencySelectorProps) {
  return (
    <select
      value={selectedCurrency}
      onChange={(e) => {
        const selected = currencies.find(c => c.code === e.target.value);
        if (selected) {
          onCurrencyChange(selected.code, selected.locale);
        }
      }}
      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-1 bg-white text-gray-900 cursor-pointer"
    >
      {currencies.map((currency) => (
        <option key={currency.code} value={currency.code}>
          {currency.symbol} {currency.code}
        </option>
      ))}
    </select>
  );
} 