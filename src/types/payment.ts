export interface Payment {
    _id?: string;
    tx_ref: string;
    amount: number;
    currency: string;
    email: string;
    first_name: string;
    last_name: string;
    status: 'pending' | 'success' | 'failed';
    payment_date: Date;
    callback_response?: any;
  }