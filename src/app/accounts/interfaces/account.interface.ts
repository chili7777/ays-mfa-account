export interface Account {
  id?: string;
  clientId: string;
  accountNumber: string;
  accountType: 'SAVINGS' | 'CURRENT';
  initialBalance: number;
  status: boolean;
}

export interface ApiResponse {
  data: any;
}
