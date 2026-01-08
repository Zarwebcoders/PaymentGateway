import { useState } from 'react';
import PaymentForm from './components/PaymentForm';
import TransactionHistory from './components/Transactions';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTransactionComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyber-accent selection:text-black font-sans relative overflow-x-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      {/* Glow Effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyber-primary/20 blur-[150px] rounded-full pointer-events-none animate-pulse-slow"></div>
      <div className="fixed bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-cyber-accent/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <header className="text-center mb-16 relative">
          <div className="inline-block mb-4 px-4 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="text-cyber-accent text-xs font-bold tracking-[0.2em] uppercase">Enterprise Grade</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500">PAYMENT</span>
            <span className="text-cyber-accent drop-shadow-[0_0_15px_rgba(0,243,255,0.5)]">GATEWAY</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto text-lg">
            Secure, fast, and reliable payment processing with instant settlement.
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
          <div className="lg:sticky lg:top-8">
            <PaymentForm onTransactionComplete={handleTransactionComplete} />
          </div>

          <div>
            <TransactionHistory refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
