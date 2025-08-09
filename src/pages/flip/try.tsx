'use client'
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Head from 'next/head';
import Modal from '../../../components/Modal';
import { useRouter } from 'next/router';
import Link from 'next/link';

function CoinFlipGame() {
  const [choice, setChoice] = useState<string>('0');
  const [bet, setBet] = useState<string>('0.1');
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [outcome, setOutcome] = useState<{ won: boolean; result: string } | null>(null);
  const [showResultScreen, setShowResultScreen] = useState<boolean>(false);
  const [balance, setBalance] = useState<number>(10); // Demo balance
  const [totalWinnings, setTotalWinnings] = useState<number>(0);

  const router = useRouter();
  const { modal } = router.query;

  // State variables for modals
  const [isHowToPlayModalOpen, setIsHowToPlayModalOpen] = useState(false);
  const [isBetsModalOpen, setIsBetsModalOpen] = useState(false);

  useEffect(() => {
    if (modal === 'howtoplay') {
      setIsHowToPlayModalOpen(true);
      setIsBetsModalOpen(false);
    } else if (modal === 'bets') {
      setIsBetsModalOpen(true);
      setIsHowToPlayModalOpen(false);
    } else {
      setIsHowToPlayModalOpen(false);
      setIsBetsModalOpen(false);
    }
  }, [modal]);

  useEffect(() => {
      if (showResultScreen && outcome?.won) {
        const audio = new window.Audio('/win.wav');
        audio.volume = 0.5;
        audio.play();
      }
    }, [showResultScreen, outcome]);

  const closeModal = () => {
    setIsHowToPlayModalOpen(false);
    setIsBetsModalOpen(false);
    router.push(router.pathname, undefined, { shallow: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const betAmount = parseFloat(bet);
    if (betAmount <= 0 || isNaN(betAmount)) {
      alert('Please enter a valid bet amount');
      return;
    }
    
    if (betAmount > balance) {
      alert('Insufficient balance');
      return;
    }

    setOutcome(null);
    setShowResultScreen(false);
    setIsFlipping(true);
    setBalance(prev => prev - betAmount);

    // Simulate coin flip after delay
    setTimeout(() => {
      const randomResult = Math.random() < 0.5 ? '0' : '1'; // 0 = heads, 1 = tails
      const won = choice === randomResult;
      const resultText = randomResult === '0' ? 'HEADS' : 'TAILS';
      
      setOutcome({
        won,
        result: resultText
      });
      
      if (won) {
        const winAmount = betAmount * 2;
        setBalance(prev => prev + winAmount);
        setTotalWinnings(prev => prev + winAmount);
      }
      
      setIsFlipping(false);
      setShowResultScreen(true);
    }, 2000);
  };

  const playAgain = () => {
    setOutcome(null);
    setShowResultScreen(false);
    setIsFlipping(false);
  };

  const isFlipButtonDisabled = isFlipping || balance <= 0;

  
  return (
    <>
      <Head>
        <title>Free Coin Flip by Broflip</title>
        <meta
          content="Free Coin Flip trial by Broflip"
          name="description"
        />
        <link href="/favicon.png" rel="icon" />
      </Head>
      <div className="flex items-center px-4 py-8">
        <div className="mx-auto w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-l xl:max-w-l">
          {isFlipping ? (
          <div className="flex flex-col items-center justify-center min-h-[200px] gap-5 p-4">
            <Image src="/giftest.gif" alt="flipping coin" height={300} width={300} unoptimized />
          </div>
        ) : showResultScreen && outcome ? (
          <div
            className={`mt-5 p-8 rounded-lg text-center min-h-[200px] flex flex-col items-center justify-center
                          ${
                            outcome.won
                              ? 'bg-green-100 border border-green-400 text-green-700'
                              : 'bg-red-100 border border-red-400 text-red-700'
                          }`}
          >
            <h2 className="text-5xl font-extrabold mb-4 animate-bounce">
              {outcome.won ? 'YOU WON!' : 'YOU LOST.'}
            </h2>
            <button
              onClick={playAgain}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-200 text-xl"
            >
              Play Again
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-lg md:grid-cols-6 md:gap-4">
                <h1 className="col-span-2 text-white text-center text-2xl mb-2 md:col-span-6">
                  <strong>CHOOSE WHAT TO BET ON</strong>
                </h1>

                <button
                  type="button"
                  onClick={() => setChoice('0')}
                  className={`
                    col-span-1
                    px-4 py-4
                    bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600
                    text-white font-bold text-xl
                    rounded-xl mb-4
                    shadow-lg
                    transition-all duration-300 ease-in-out
                    ${choice === '0' ? 'border-3 border-white' : 'border-3 border-transparent'}
                    hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700
                    hover:shadow-xl hover:-translate-y-1
                    active:scale-95 active:shadow-inner
                    disabled:opacity-50 disabled:cursor-not-allowed
                    md:col-span-3 md:px-8 md:py-5 md:text-2xl
                  `}
                >
                  HEADS
                </button>
                <button
                  type="button"
                  onClick={() => setChoice('1')}
                  className={`
                    col-span-1
                    px-4 py-4
                    bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600
                    text-white font-bold text-xl
                    rounded-xl mb-4
                    shadow-lg
                    transition-all duration-300 ease-in-out
                    ${choice === '1' ? 'border-3 border-white' : 'border-3 border-transparent'}
                    hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700
                    hover:shadow-xl hover:-translate-y-1
                    active:scale-95 active:shadow-inner
                    disabled:opacity-50 disabled:cursor-not-allowed
                    md:col-span-3 md:px-8 md:py-5 md:text-2xl
                  `}
                >
                  TAILS
                </button>

               

                <button
                  type="submit"
                  disabled={isFlipButtonDisabled}
                  className="
                    col-span-2
                    px-4 py-3
                    bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600
                    text-white font-bold text-xl
                    rounded-xl
                    shadow-lg
                    transition-all duration-300 ease-in-out
                    hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700
                    hover:shadow-xl hover:-translate-y-1
                    active:scale-95 active:shadow-inner
                    focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-75
                    disabled:opacity-50 disabled:cursor-not-allowed
                    md:col-span-6 md:px-8 md:py-4
                  "
                >
                  {isFlipButtonDisabled && balance <= 0 ? 'INSUFFICIENT BALANCE' : 'FLIP COIN'}
                </button>
              </div>  
            </form>
            <div className="text-center">
              <Link href="/flip" className="text-white">
                Play for real
              </Link>
            </div>
          </>
        )}
        </div>
      </div>

      {/* How To Play Modal */}
      <Modal isOpen={isHowToPlayModalOpen} onClose={closeModal}>
        <div className="mt-2 text-lg/6 text-white/70">
          <ol className="list-decimal list-inside text-gray-300">
            <li>Connect your wallet</li>
            <li>Choose Heads or Tails</li>
            <li>Choose a bet amount and flip</li>
            <li>Wait for the outcome</li>
            <li>Withdraw and play again</li>
          </ol>
          <p className="mt-4 text-sm text-gray-300">
            If your bet gets stuck for too long, don&apos;t worry. Everything is handled on the blockchain. Refresh and check your bets
          </p>
        </div>
      </Modal>

      {/* Player Bets Modal */}
      <Modal isOpen={isBetsModalOpen} onClose={closeModal}>
        <div className="text-white">
          <h3 className="text-xl font-bold mb-4">Game Statistics</h3>
          <div className="space-y-2">
            <p>Current Balance: {balance.toFixed(2)} S</p>
            <p>Total Winnings: {totalWinnings.toFixed(2)} S</p>
            <p>This is a demo version - no real blockchain transactions</p>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default CoinFlipGame;