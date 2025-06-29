import { BillItem } from '../types';
import Input from './Input';
import { MdClose } from 'react-icons/md';

interface BillItemProps {
  item: BillItem;
  onUpdate: (id: number, field: keyof BillItem, value: string) => void;
  onRemove: (id: number) => void;
}

export default function BillItems({ item, onUpdate, onRemove }: BillItemProps) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="flex-grow">
        <Input
          type="text"
          value={item.name}
          onChange={(value) => onUpdate(item.id, 'name', value)}
          label="Item Name"
          placeholder=" "
        />
      </div>
      <div className="w-16">
        <Input
          type="number"
          value={item.quantity}
          onChange={(value) => onUpdate(item.id, 'quantity', value)}
          label={
            <>
              <span className="sm:hidden">Qty</span>
              <span className="hidden sm:inline">Quantity</span>
            </>
          }
          placeholder=" "
          min="1"
        />
      </div>
      <div className="w-24">
        <Input
          type="number"
          value={item.price}
          onChange={(value) => onUpdate(item.id, 'price', value)}
          label="Price"
          placeholder="0.00"
          min="0"
          step="0.01"
        />
      </div>
      <button 
        onClick={() => onRemove(item.id)}
        className="remove-button"
        title="Remove"
      >
        <MdClose />
      </button>
    </div>
  );
}