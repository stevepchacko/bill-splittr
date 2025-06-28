import { Person } from '../types';

interface PersonSelectorProps {
  person: Person;
  onUpdate: (id: number, name: string) => void;
  onRemove: (id: number) => void;
}

export default function PersonSelector({ person, onUpdate, onRemove }: PersonSelectorProps) {
  return (
    <div className="flex items-center gap-4 mb-3">
      <input
        type="text"
        value={person.name}
        onChange={(e) => onUpdate(person.id, e.target.value)}
        placeholder="Person name"
        className="border rounded px-3 py-2 flex-grow"
      />
      <button 
        onClick={() => onRemove(person.id)}
        className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
      >
        Remove
      </button>
    </div>
  );
}