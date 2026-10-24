export interface WalletActivityDay {
  date: string;
  credited: string;
  spent: string;
  balance: string;
}

export interface WalletActivity {
  days: WalletActivityDay[];
  serverNow: number;
}
