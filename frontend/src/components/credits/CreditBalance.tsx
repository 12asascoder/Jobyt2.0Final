interface CreditBalanceProps {
  balance: number;
  className?: string;
}

export const CreditBalance = ({ balance, className }: CreditBalanceProps) => (
  <div className={`flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 ${className}`}>
    <span className="text-2xl">💳</span>
    <div>
      <p className="text-xs font-medium text-blue-600">Credit Balance</p>
      <p className="text-xl font-bold text-blue-900">{balance.toLocaleString()}</p>
    </div>
  </div>
);
