import { formatCurrency } from '../utils/currency';

interface ResultsProps {
  people: { id: number; name: string }[];
  totals: { [key: number]: number };
  onRestart: () => void;
  locale?: string;
  currency?: string;
}

export default function Results({ people, totals, onRestart, locale = 'en-US', currency = 'USD' }: ResultsProps) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">Amounts Owed:</h3>
      <ul className="space-y-2 mb-6">
        {people.map(person => (
          <li key={person.id} className="flex justify-between border-b pb-2">
            <span className="font-medium">{person.name}</span>
            <span>{formatCurrency(totals[person.id] || 0, locale, currency)}</span>
          </li>
        ))}
      </ul>
      <button 
        onClick={onRestart}
        className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
      >
        Start Over
      </button>
    </div>
  );
}