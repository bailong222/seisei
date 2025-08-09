'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent} from 'wagmi';
import { parseEther, Hex, formatEther } from 'viem';
import { ABI } from "../../../components/coinflip-abi";
import Image from 'next/image';
import { readContract } from '@wagmi/core';
import { config } from '../../wagmi';
import Head from 'next/head';
import Modal from '../../../components/Modal';
import { useRouter } from 'next/router';
import PlayerEvents from "../../../components/coinflipPlayerEvents";
import CombinedGameEvents from "../../../components/combined-events";
import Link from 'next/link';

const COIN_CONTRACT_ADDRESS: Hex = "0xD0F83311d99e2DeC0517f49d31e1971590D5C09C";

function CoinFlipGame() {
  const { address: playerAddress, isConnected } = useAccount();
  const [choice, setChoice] = useState<string>('0');
  const [bet, setBet] = useState<string>('0');
  const [isLoadingOutcome, setIsLoadingOutcome] = useState<boolean>(false);
  const [outcome, setOutcome] = useState<{ won: boolean } | null>(null);
  const [showResultScreen, setShowResultScreen] = useState<boolean>(false);

  // Wagmi hooks for sending the 'flip' transaction
  const { writeContract: flip, error: flipError} = useWriteContract();
  

  // State and hooks for managing player's withdrawable balance
  const [withdrawableBalance, setWithdrawableBalance] = useState<bigint>(0n);
    const { data: withdrawTxHash, writeContract: withdraw, isPending: isWithdrawTxPending, error: withdrawError } = useWriteContract();
    const { isLoading: isWithdrawTxConfirming, isSuccess: isWithdrawTxConfirmed } = useWaitForTransactionReceipt({
        hash: withdrawTxHash,
    });

  // Use a ref to store the latest playerAddress, useful for event listeners
  const playerAddressRef = useRef(playerAddress);
  useEffect(() => {
    playerAddressRef.current = playerAddress;
  }, [playerAddress]);

  const fetchPlayerBalance = async () => {
    if (!playerAddress) {
      setWithdrawableBalance(0n); // Reset if no player connected
      return;
    }
    try {
      const balance = await readContract(config, {
        abi: ABI,
        address: COIN_CONTRACT_ADDRESS,
        functionName: 'getPlayerBalance',
        args: [playerAddress],
      });
      setWithdrawableBalance(balance as bigint);
    } catch (err) {
      console.error("Error fetching player balance:", err);
    }
  };

  useEffect(() => {
    fetchPlayerBalance()
  },[isWithdrawTxConfirmed])

  useEffect(() => {
    fetchPlayerBalance()
  },[isConnected])

  // Listen for the Roll event (this is what determines win/loss)
  useWatchContractEvent({
    address: COIN_CONTRACT_ADDRESS,
    abi: ABI,
    eventName: 'Roll',
    enabled: !!playerAddress && isLoadingOutcome, 
    onLogs(logs) {
      const relevantLogs = logs.filter(log =>
        (log.args as { player: string, choice: BigInt, outcome: BigInt, won: boolean }).player === playerAddressRef.current
      );

      if (relevantLogs.length > 0) {
        const lastLog = relevantLogs[relevantLogs.length - 1];
        const args = lastLog.args as { won: boolean };
        setShowResultScreen(true);
        setOutcome({
          won: args.won
        });
        setIsLoadingOutcome(false); // Outcome received, stop loading
        fetchPlayerBalance(); // Fetch updated balance after a flip
      }
    },
  });

  // Handler for submitting the coin flip transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerAddress) {
      // Potentially show a "Connect Wallet" message here instead of just returning
      return;
    }
    if (parseFloat(bet) <= 0 || isNaN(parseFloat(bet))) {
      // Potentially show an error for invalid bet
      return;
    }

 
    setOutcome(null);
    setShowResultScreen(false);
    setIsLoadingOutcome(true); 
  
    try {
      await flip({
        abi: ABI,
        address: COIN_CONTRACT_ADDRESS,
        functionName: 'flip',
        args: [BigInt(choice)],
        value: parseEther(bet),
      });
    } catch (err) {
      console.error("Error submitting flip transaction:", err);
      // Handle error: maybe show a user-friendly message
    }
  };
  useEffect(() => {
    if (flipError) {
      console.error("Flip transaction write error:", flipError);
      setIsLoadingOutcome(false);
      setOutcome(null);
      setShowResultScreen(false);
   
    }
  }, [flipError]);
  
  const handleWithdraw = async () => {
    if(!playerAddress){
      return;
    }
    if(withdrawableBalance === 0n){
      return;
    }
    try{
      await withdraw({
        abi: ABI,
        address: COIN_CONTRACT_ADDRESS,
        functionName: 'withdrawWinnings',
      });
    } catch(err){
      console.log("ror withdrawing")
    }
  }
  const handleWithdrawAndPlayAgain = async () => {
    if (!playerAddress) {
      return;
    }
    if (withdrawableBalance === 0n) {
      // If no winnings, just reset the screen to allow playing again
      setOutcome(null);
      setShowResultScreen(false);
      setIsLoadingOutcome(false);
      return;
    }

    try {
      // Initiate the withdrawal transaction
      await withdraw({
        abi: ABI,
        address: COIN_CONTRACT_ADDRESS,
        functionName: 'withdrawWinnings',
      });
    } catch (err) {
      console.error("Error withdrawing:", err);
      // If withdrawal fails, still allow playing again by resetting the screen
      setOutcome(null);
      setShowResultScreen(false);
      setIsLoadingOutcome(false);
    }
  };
 
  const isFlipButtonDisabled = isLoadingOutcome || !isConnected;

  useEffect(() => {
        if (isWithdrawTxConfirmed) {
            setOutcome(null);
            setShowResultScreen(false);
        } else if (withdrawError) {
            setOutcome(null);
            setShowResultScreen(false);
        }
    }, [isWithdrawTxConfirmed, withdrawError]);

    useEffect(() => {
    if (showResultScreen && outcome?.won) {
      const audio = new window.Audio('/win.wav');
      audio.volume = 0.5;
      audio.play();
    }
  }, [showResultScreen, outcome]);

  const router = useRouter(); // Initialize the router
  const { modal } = router.query; // Destructure the 'modal' query parameter

  // State variables for each specific modal's open/closed status
  const [isHowToPlayModalOpen, setIsHowToPlayModalOpen] = useState(false);
  const [isBetsModalOpen, setIsBetsModalOpen] = useState(false);
  // useEffect to react to changes in the 'modal' query parameter
  useEffect(() => {
    // If 'modal' query is 'howtoplay', open the how-to-play modal, close others
    if (modal === 'howtoplay') {
      setIsHowToPlayModalOpen(true);
      setIsBetsModalOpen(false);
    } 
    else if (modal === 'bets') {
      setIsBetsModalOpen(true);
      setIsHowToPlayModalOpen(false);
    }
    // If 'modal' query is not present or not recognized, close all modals
    else {
      setIsHowToPlayModalOpen(false);
      setIsBetsModalOpen(false);
    }
  }, [modal]);
  const closeModal = () => {
    setIsHowToPlayModalOpen(false);
    setIsBetsModalOpen(false);
    // Remove the 'modal' query parameter from the URL
    // router.pathname gets the current path (e.g., "/").
    // The second argument `undefined` makes it remove the query string.
    // { shallow: true } prevents a full page reload.
    router.push(router.pathname, undefined, { shallow: true });
  };

  
  return (
    <>
      <Head>
        <title>Coin Flip by Broflip</title>
        <meta
          content="Coinflip betting game on the Sonic blockchain. Decentralized and fair. Connect your wallet, flip and withdraw"
          name="description"
        />
        <link href="/favicon.png" rel="icon" />
      </Head>
      <div className="mx-auto w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-l xl:max-w-l">
        {isLoadingOutcome ? (
          <div className="flex flex-col items-center justify-center min-h-[200px] gap-5 p-4">
            <Image src="/giftest.gif" alt="loading" height={300} width={300} unoptimized />
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
              onClick={handleWithdrawAndPlayAgain}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-200 text-xl disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isWithdrawTxConfirming || isWithdrawTxPending}
            >
              {isWithdrawTxPending || isWithdrawTxConfirming ? "Withdrawing..." : (withdrawableBalance > 0n ? 'Withdraw winnings' : 'Play Again')}
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

                <h1 className="col-span-2 text-white text-center text-2xl mb-2 md:col-span-6">
                  <strong>CHOOSE A BET AMOUNT</strong>
                </h1>

                <button
                  type="button"
                  onClick={() => setBet('1')}
                  className={`
                    col-span-1
                    px-2 py-3
                    bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600
                    text-white font-bold text-lg
                    rounded-xl
                    shadow-lg
                    transition-all duration-300 ease-in-out
                    ${bet === '1' ? 'border-3 border-white' : 'border-3 border-transparent'}
                    hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700
                    hover:shadow-xl hover:-translate-y-1
                    active:scale-95 active:shadow-inner
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center
                    gap-2
                    md:col-span-2 md:px-4 md:py-4 md:text-xl
                  `}
                >
                  1 S
                </button>
                <button
                  type="button"
                  onClick={() => setBet('5')}
                  className={`
                    col-span-1
                    px-2 py-3
                    bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600
                    text-white font-bold text-lg
                    rounded-xl
                    shadow-lg
                    transition-all duration-300 ease-in-out
                    ${bet === '5' ? 'border-3 border-white' : 'border-3 border-transparent'}
                    hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700
                    hover:shadow-xl hover:-translate-y-1
                    active:scale-95 active:shadow-inner
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center
                    gap-2
                    md:col-span-2 md:px-4 md:py-4 md:text-xl
                  `}
                >
                  5 S
                </button>
                <button
                  type="button"
                  onClick={() => setBet('10')}
                  className={`
                    col-span-1
                    px-2 py-3
                    bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600
                    text-white font-bold text-lg
                    rounded-xl
                    shadow-lg
                    transition-all duration-300 ease-in-out
                    ${bet === '10' ? 'border-3 border-white' : 'border-3 border-transparent'}
                    hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700
                    hover:shadow-xl hover:-translate-y-1
                    active:scale-95 active:shadow-inner
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center
                    gap-2
                    md:col-span-2 md:px-4 md:py-4 md:text-xl
                  `}
                >
                  10 S
                </button>
                <button
                  type="button"
                  onClick={() => setBet('20')}
                  className={`
                    col-span-1
                    px-2 py-3
                    bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600
                    text-white font-bold text-lg
                    rounded-xl
                    shadow-lg
                    transition-all duration-300 ease-in-out
                    ${bet === '20' ? 'border-3 border-white' : 'border-3 border-transparent'}
                    hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700
                    hover:shadow-xl hover:-translate-y-1
                    active:scale-95 active:shadow-inner
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center
                    gap-2
                    md:col-span-2 md:px-4 md:py-4 md:text-xl
                  `}
                >
                  20 S
                </button>
                <button
                  type="button"
                  onClick={() => setBet('30')}
                  className={`
                    col-span-1
                    px-2 py-3
                    bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600
                    text-white font-bold text-lg
                    rounded-xl
                    shadow-lg
                    transition-all duration-300 ease-in-out
                    ${bet === '30' ? 'border-3 border-white' : 'border-3 border-transparent'}
                    hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700
                    hover:shadow-xl hover:-translate-y-1
                    active:scale-95 active:shadow-inner
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center
                    gap-2
                    md:col-span-2 md:px-4 md:py-4 md:text-xl
                  `}
                >
                  30 S
                </button>
                <button
                  type="button"
                  onClick={() => setBet('69')}
                  className={`
                    col-span-1
                    px-2 py-3
                    bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600
                    text-white font-bold text-lg
                    rounded-xl
                    shadow-lg
                    transition-all duration-300 ease-in-out
                    ${bet === '69' ? 'border-3 border-white' : 'border-3 border-transparent'}
                    hover:from-yellow-500 hover:via-yellow-600 hover:to-yellow-700
                    hover:shadow-xl hover:-translate-y-1
                    active:scale-95 active:shadow-inner
                    disabled:opacity-50 disabled:cursor-not-allowed
                    flex items-center justify-center
                    gap-2
                    md:col-span-2 md:px-4 md:py-4 md:text-xl
                  `}
                >
                  69 S
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
                    disabled:cursor-not-allowed
                    md:col-span-6 md:px-8 md:py-4
                  "
                >
                  FLIP COIN
                </button>
              </div>  
            </form>
            <div className="flex justify-center mt-4">
              <Link 
                href="/flip/try"
                className='text-white'
              >
                Try for free
              </Link>
            </div>
          </>
        )}
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
        <PlayerEvents />
        <div className="flex flex-row justify-between mt-2 text-white items-center">
          <p>Your withdrawable balance: {formatEther(withdrawableBalance)} Sei</p>
          <button onClick={handleWithdraw} className="text-white bg-green-700 p-1 px-2 rounded">
            Withdraw
          </button>
        </div>
      </Modal>
    </>
  );
}

export default CoinFlipGame;