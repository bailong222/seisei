import React, { useState, useRef, useEffect } from "react";
import { Range } from 'react-range';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, useBalance } from 'wagmi';
import { parseEther, Hex, formatEther } from 'viem';
import { ABI } from "../../../components/dice-abi";
import { readContract } from '@wagmi/core';
import {config} from "../../wagmi"
import Image from "next/image";
import Modal from "../../../components/Modal"
import { useRouter } from "next/router";
import PlayerEvents from "../../../components/dicePlayerEvents";
import Head from "next/head";
import CombinedGameEvents from "../../../components/combined-events"
import Link from "next/link";

const CONTRACT_ADDRESS: Hex = "0xd60aF0bbE2C6EFeD5651Ef48feb0BF0d77323D9e";

function Roll() {
    const [winChance, setWinChance] = useState(50);
    const { address: playerAddress, isConnected } = useAccount();
    const { data: balanceData } = useBalance({ address: playerAddress });
    const [bet, setBet] = useState<string>('5.0');
    const [payout, setPayout] = useState(0);
    const [isLoadingOutcome, setIsLoadingOutcome] = useState<boolean>(false);
    const [outcome, setOutcome] = useState<{ outcome: bigint, won: boolean } | null>(null);
    const [showResultScreen, setShowResultScreen] = useState<boolean>(false);
    const [multiplier, setMultiplier] = useState<number>(0);
    const [rollOver, setRollOver] = useState(0);
    const min = 4;
    const max = 96;

    const balanceDataFormatted = balanceData?.value ? parseFloat(formatEther(balanceData.value)) : 0;
    const diceRollAudioRef = useRef<HTMLAudioElement | null>(null); 

    const { writeContract: flip, error: flipError} = useWriteContract();
   

    const [withdrawableBalance, setWithdrawableBalance] = useState<bigint>(0n);
    const { data: withdrawTxHash, writeContract: withdraw, isPending: isWithdrawTxPending, error: withdrawError } = useWriteContract();
    const { isLoading: isWithdrawTxConfirming, isSuccess: isWithdrawTxConfirmed } = useWaitForTransactionReceipt({
        hash: withdrawTxHash,
    });

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
        address: CONTRACT_ADDRESS,
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
  },[isConnected])

  useEffect(() => {
    fetchPlayerBalance()
  },[showResultScreen])

    useWatchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        eventName: 'Roll',
        enabled: isLoadingOutcome,
        onLogs(logs) {
            const relevantLogs = logs.filter(log =>
                (log.args as { player: string, outcome: bigint, won: boolean }).player === playerAddressRef.current
            );

            if (relevantLogs.length > 0 && isLoadingOutcome) {
                const lastLog = relevantLogs[relevantLogs.length - 1];
                const args = lastLog.args as { outcome: bigint, won: boolean };
                setShowResultScreen(true);
                setOutcome({
                    outcome: args.outcome,
                    won: args.won
                });
                setIsLoadingOutcome(false);
                fetchPlayerBalance();
            }
        },
    });

    useEffect(() => {
    if (flipError) {
      console.error("Flip transaction write error:", flipError);
      setIsLoadingOutcome(false);
      setOutcome(null);
      setShowResultScreen(false);
   
    }
  }, [flipError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!playerAddress) {
            return;
        }
        if (parseFloat(bet) <= 0 || isNaN(parseFloat(bet))) {
        }

        setOutcome(null);
        setShowResultScreen(false);
        setIsLoadingOutcome(false);

        try {
            await flip({
                abi: ABI,
                address: CONTRACT_ADDRESS,
                functionName: 'flip',
                args: [BigInt(winChance)],
                value: parseEther(bet),
            }); 
            setIsLoadingOutcome(true);
        } catch (err) {
            console.error("Error submitting flip transaction:", err);
        }
    };

    const handleWithdrawAndPlayAgain = async () => {
        if (!playerAddress) {
            return;
        }
        if (withdrawableBalance === 0n) {
            setOutcome(null);
            setShowResultScreen(false);
            setIsLoadingOutcome(false);
            return;
        }

        try {
            await withdraw({
                abi: ABI,
                address: CONTRACT_ADDRESS,
                functionName: 'withdrawWinnings',
            }); 
            setIsLoadingOutcome(false);
        } catch (err) {
            console.error("Error withdrawing:", err);
            setOutcome(null);
            setShowResultScreen(false);
        }
    };

    useEffect(() => {
        if (isWithdrawTxConfirmed) {
            setOutcome(null);
            setShowResultScreen(false);
        } else if (withdrawError) {
            setOutcome(null);
            setShowResultScreen(false);
        }
    }, [isWithdrawTxConfirmed, withdrawError]);

    const isBetDisabled = isWithdrawTxPending || isWithdrawTxConfirming || isLoadingOutcome;

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const prevWinChanceRef = useRef(winChance);

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio('/typewrite.mp3');
            audioRef.current.load();
            audioRef.current.volume = 0.5;
            audioRef.current.addEventListener('error', (e) => {
                console.error("Error loading audio file:", e);
            });
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        };
    }, []);

    useEffect(() => {
        if (audioRef.current && winChance !== prevWinChanceRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => {
                console.warn("Audio playback prevented or failed:", e);
            });
        }
        prevWinChanceRef.current = winChance;
    }, [winChance]);

    const getTrackBackground = () => {
        const percentage = ((winChance - min) / (max - min)) * 100;
        return `linear-gradient(to right,
            #84cc16 ${percentage}%,
            #ef4444 ${percentage}%)`;
    };

      const getOutcomeImagePosition = (outcomeValue: number) => {
          // Calculate the position of the outcome on the slider
          // This assumes a linear mapping from min-max to 0-100% of the track width
          const sliderRange = max - min;
          const positionPercentage = ((outcomeValue - min) / sliderRange) * 100;
          return `${positionPercentage}%`;
      };

    useEffect(() => {
        const payoutCalculation = parseFloat(bet) * 97 / winChance;
        setPayout(payoutCalculation);
    }, [bet, winChance]);

    useEffect(() => {
        const rollOverCalculation = winChance;
        setRollOver(rollOverCalculation);
    }, [winChance]);

    useEffect(() => {
        const multiplierCalculation = 97 / winChance;
        setMultiplier(multiplierCalculation);
    }, [winChance]);

    useEffect(() => {
    if (!diceRollAudioRef.current) {
        diceRollAudioRef.current = new Audio('/cashregister.mp3');
        diceRollAudioRef.current.load(); // Preload the audio
        diceRollAudioRef.current.volume = 0.7; // Adjust volume as needed
        diceRollAudioRef.current.addEventListener('error', (e) => {
            console.error("Error loading dice roll audio file:", e);
        });
    }
}, []);

    useEffect(() => {
    if (outcome) {
        if (diceRollAudioRef.current) {
            diceRollAudioRef.current.currentTime = 0; // Rewind to start for repeated plays
            diceRollAudioRef.current.play().catch(e => {
                console.warn("Dice roll audio playback prevented or failed:", e);
            });
        }
    }
}, [outcome]);

 const router = useRouter(); // Initialize the router
  const { modal } = router.query; // Destructure the 'modal' query parameter

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
  //cum
    return (
        <>
       <Head>
        <title>Dice by Broflip</title>
        <meta
          content="Dice betting game on the Sonic blockchain. Decentralized and fair. Connect your wallet, roll and withdraw"
          name="description"
        />
        <link href="/favicon.png" rel="icon" />
      </Head>
            <div className="w-full max-w-2xl mx-auto p-4 sm:p-8 flex flex-col items-center gap-6 sm:gap-10">
                <div className="flex flex-col gap-6 w-full border border-2 border-white p-4 rounded-xl text-lg sm:text-2xl items-center">

                
                    <div className="hidden sm:flex sm:flex-row sm:justify-between w-full sm:gap-x-8 text-white">
                        <div className="flex flex-col sm:flex-1 min-w-0">
                            <p className="text-sm sm:text-base text-left">Bet amount</p>
                            <input
                                type="number" step="0.5" min="1" max={balanceDataFormatted}
                                value={bet} disabled={isBetDisabled || !playerAddress}
                                onChange={(e) => {
        const value = e.target.value;
        const minValue = 1;
                                
       
        if (value === '') {
            setBet('');
            return;
        }

        const parsedValue = parseFloat(value);

        if (!isNaN(parsedValue) && parsedValue >= minValue) {
            setBet(value);
        } else {
            alert("Minimum bet amount is 1 sonic")
        }
    }}
                                className="text-center bg-gray-300 text-black rounded-sm py-1 w-full"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-1 min-w-0">
                            <p className="text-sm sm:text-base text-left">Payout</p>
                            <input
                                type="text" readOnly value={payout.toFixed(2)}
                                className="text-center bg-gray-400 text-black rounded-sm py-1 focus:outline-none w-full"
                            />
                        </div>
                    </div>

                    <div className="hidden sm:flex sm:flex-row sm:justify-between w-full sm:gap-x-8 text-white">
                        <div className="flex flex-col sm:flex-1 min-w-0">
                            <p className="text-sm sm:text-base text-left">Roll under</p>
                            <input value={rollOver} readOnly className="text-lg sm:text-2xl text-center font-bold mb-2 sm:mb-4 bg-gray-400 text-black rounded-sm py-1 focus:outline-none w-full" />
                        </div>
                        <div className="flex flex-col sm:flex-1 min-w-0">
                            <p className="text-sm sm:text-base text-left">Win chance</p>
                            <input value={winChance} step="1" type="number" readOnly className="text-lg sm:text-2xl text-center font-bold mb-2 sm:mb-4 bg-gray-400 text-black rounded-sm py-1 focus:outline-none w-full" />
                        </div>
                        <div className="flex flex-col sm:flex-1 min-w-0">
                            <p className="text-sm sm:text-base text-left">Multiplier</p>
                            <input value={multiplier.toFixed(2)} step="1" type="number" readOnly className="text-lg sm:text-2xl text-center font-bold mb-2 sm:mb-4 bg-gray-400 text-black rounded-sm py-1 focus:outline-none w-full" />
                        </div>
                    </div>

                    {/* --- MOBILE LAYOUT (less than sm:) --- */}
                    <div className="sm:hidden flex flex-col w-full text-white">
                        <p className="text-sm text-left">Bet amount</p>
                        <input
                            type="number" step="0.5" min="1" max={balanceDataFormatted}
                            value={bet} disabled={isBetDisabled || !playerAddress}
                            onChange={(e) => {
        const value = e.target.value;
        const minValue = 1;

       
        if (value === '') {
            setBet('');
            return;
        }

        const parsedValue = parseFloat(value);

        if (!isNaN(parsedValue) && parsedValue >= minValue) {
            setBet(value);
        } else {
            alert("Minimum bet amount is 1 sonic")
        }
    }}
                            className="text-center bg-gray-300 text-black rounded-sm py-1 w-full"
                        />
                    </div>

                    <div className="sm:hidden grid grid-cols-2 gap-4 w-full text-white">
                        <div className="flex flex-col w-full">
                            <p className="text-sm text-left">Payout</p>
                            <input
                                type="text" readOnly value={payout.toFixed(2)}
                                className="text-center bg-gray-400 text-black rounded-sm py-1 focus:outline-none w-full"
                            />
                        </div>
                        <div className="flex flex-col w-full">
                            <p className="text-sm text-left">Roll under</p>
                            <input value={rollOver} readOnly className="text-lg text-center font-bold mb-2 bg-gray-400 text-black rounded-sm py-1 focus:outline-none w-full" />
                        </div>
                        <div className="flex flex-col w-full">
                            <p className="text-sm text-left">Win chance</p>
                            <input value={winChance} step="1" type="number" readOnly className="text-lg text-center font-bold mb-2 bg-gray-400 text-black rounded-sm py-1 focus:outline-none w-full" />
                        </div>
                        <div className="flex flex-col w-full">
                            <p className="text-sm text-left">Multiplier</p>
                            <input value={multiplier.toFixed(2)} step="1" type="number" readOnly className="text-lg text-center font-bold mb-2 bg-gray-400 text-black rounded-sm py-1 focus:outline-none w-full" />
                        </div>
                    </div>

                    {isLoadingOutcome ? (
                        <button className="bg-gray-300 rounded-xl w-2/3 sm:w-1/3 p-2 text-black flex justify-center"><div className="loader m-0 p-0"></div></button>
                    ) : showResultScreen && outcome ? (
                        <>
                            <button
                                onClick={handleWithdrawAndPlayAgain}
                                disabled={isWithdrawTxPending || isWithdrawTxConfirming}
                                className={`${outcome.won ? ("bg-green-300") : ("bg-gray-300")} rounded-xl w-2/3 sm:w-1/3 p-2 text-black flex justify-center`}
                            >
                                {isWithdrawTxPending || isWithdrawTxConfirming ? "Claiming" : (withdrawableBalance > 0n ? 'Claim' : 'Play Again')}
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={handleSubmit} disabled={isBetDisabled} className="bg-gray-300 rounded-xl w-2/3 sm:w-1/3 p-2 text-black">Roll</button>
                        </>
                    )}
                </div>

                <div className="bg-gray-400 w-full py-3 px-3 flex flex-row gap-2 items-center rounded-full relative">
                    <p className="px-3 text-sm sm:text-base">0</p>
                    <Range
                        step={1}
                        min={min}
                        max={max}
                        values={[winChance]}
                        disabled={isBetDisabled}
                        onChange={(newValues) => {
                            setWinChance(newValues[0]);
                        }}
                        renderTrack={({ props, children }) => (
                            <div
                                {...props}
                                onMouseDown={(e) => {
                                    if (e.target === props.ref.current) {
                                        e.preventDefault();
                                    }
                                    if (props.onMouseDown && e.target !== props.ref.current) {
                                        props.onMouseDown(e);
                                    }
                                }}
                                className="custom-slider-track"
                                style={{
                                    ...props.style,
                                    background: getTrackBackground(),
                                }}
                            >
                                {outcome && (
                          <Image src='/pixelcoindice.png' alt='dice' width={40} height={40} className='absolute -top-10 z-69' style={{
                            left: getOutcomeImagePosition(Number(outcome.outcome)),
                                  transform: 'translateX(-50%)',
                          }}/>
                      )}
                                {children}
                            </div>
                        )}
                        renderThumb={({ props }) => (
                            <div
                                {...props}
                                className="custom-slider-thumb"
                                style={{
                                    ...props.style,
                                    background: 'linear-gradient(oklch(85.2% 0.199 91.936), oklch(79.5% 0.184 86.047), oklch(68.1% 0.162 75.834))',
                                }}
                            />
                        )}
                    /><p className="px-3 text-sm sm:text-base">100</p>
                      
                </div>
                <Link href="/dice/try" className="text-white">
                  Try For Free
                </Link>
            </div>
            <Modal isOpen={isHowToPlayModalOpen} onClose={closeModal}>
        <div className="mt-2 text-lg/6 text-white/70">
          <ol className="list-decimal list-inside text-gray-300">
            <li>Connect your wallet</li>
            <li>Choose a multiplier with the slider</li>
            <li>Choose a bet amount and roll</li>
            <li>Wait for the outcome</li>
            <li>Withdraw and play again</li>
          </ol>
          <p className="mt-4 text-sm text-gray-300">
            If your bet gets stuck for too long, don&apos;t worry. Everything is handled on the blockchain. Refresh and check your bets
          </p>
        </div>
      </Modal>
      <Modal isOpen={isBetsModalOpen} onClose={closeModal}>
        <PlayerEvents/>
        <div className='flex flex-row justify-between mt-2 text-white items-center'>
        <p>Your withdrawable balance: {formatEther(withdrawableBalance)} Sei</p>
        <button className='text-white bg-green-700 p-1 px-2 rounded' onClick={handleWithdrawAndPlayAgain} >Withdraw</button>
        </div>
      </Modal>
        </>
    );
}

export default Roll;