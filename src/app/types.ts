export interface BillItem {
    id: number;
    name: string;
    price: string;
    quantity: string;
    equalSplit?: boolean;
  }
  
  export interface ExtraCharge {
    id: number;
    name: string;
    value: string;
    type: 'amount' | 'percentage';
    calculatedValue: string;
  }
  
  export interface Person {
    id: number;
    name: string;
  }
  
  export interface Share {
    itemId: number;
    share: boolean;
    quantity?: number;
  }
  
  export interface Shares {
    [personId: number]: Share[];
  }