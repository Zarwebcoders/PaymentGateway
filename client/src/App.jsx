import React, { useState } from 'react';
import PayoutForm from './components/PayoutForm';
import TransactionHistory from './components/Transactions';

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePayoutSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen p-6 md:p-12 bg-cyber-black text-white selection:bg-cyber-accent selection:text-black">
      {/* Background Glow */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-primary/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyber-accent/20 rounded-full blur-[120px]"></div>
      </div>

      <header className="max-w-7xl mx-auto mb-12 text-center">
        <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyber-primary via-blue-500 to-cyber-accent mb-4">
          PayRaizen Gateway
        </h1>
        <p className="text-gray-400 text-lg">Secure & Fast Payout Automation</p>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        <div className="lg:sticky lg:top-8">
          <PayoutForm onPayoutSuccess={handlePayoutSuccess} />
        </div>
        <div>
          <TransactionHistory refreshTrigger={refreshKey} />
        </div>
      </main>
    </div>
  );
}

export default App;
