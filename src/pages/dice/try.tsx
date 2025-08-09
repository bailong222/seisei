import React, { useState, useRef, useEffect } from "react";
import { Range } from 'react-range';
import Image from "next/image";
import Modal from "../../../components/Modal"
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";

function Roll() {
    const [winChance, setWinChance] = useState(50);
    const [bet] = useState<string>('0');
    const [payout, setPayout] = useState(0);
    const [isLoadingOutcome, setIsLoadingOutcome] = useState<boolean>(false);
    const [outcome, setOutcome] = useState<{ outcome: bigint, won: boolean } | null>(null);
    const [showResultScreen, setShowResultScreen] = useState<boolean>(false);
    const [multiplier, setMultiplier] = useState<number>(0);
    const [rollOver, setRollOver] = useState(0);
    const min = 4;
    const max = 96;

    const diceRollAudioRef = useRef<HTMLAudioElement | null>(null);

    // Simulate a dice roll
    const simulateRoll = () => {
        setIsLoadingOutcome(true);
        setOutcome(null);
        setShowResultScreen(false);

        // Simulate network delay
        setTimeout(() => {
            const rollResult = Math.floor(Math.random() * 100) + 1;
            const won = rollResult <= winChance;
            
            setOutcome({
                outcome: BigInt(rollResult),
                won: won
            });
            setShowResultScreen(true);
            setIsLoadingOutcome(false);
        }, 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        simulateRoll();
    };

    const handlePlayAgain = () => {
        setOutcome(null);
        setShowResultScreen(false);
        setIsLoadingOutcome(false);
    };

    const isBetDisabled = isLoadingOutcome;

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
            diceRollAudioRef.current.load();
            diceRollAudioRef.current.volume = 0.7;
            diceRollAudioRef.current.addEventListener('error', (e) => {
                console.error("Error loading dice roll audio file:", e);
            });
        }
    }, []);

    useEffect(() => {
        if (outcome) {
            if (diceRollAudioRef.current) {
                diceRollAudioRef.current.currentTime = 0;
                diceRollAudioRef.current.play().catch(e => {
                    console.warn("Dice roll audio playback prevented or failed:", e);
                });
            }
        }
    }, [outcome]);

    const router = useRouter();
    const { modal } = router.query;

    const [isHowToPlayModalOpen, setIsHowToPlayModalOpen] = useState(false);
    const [isBetsModalOpen, setIsBetsModalOpen] = useState(false);
    
    useEffect(() => {
        if (modal === 'howtoplay') {
            setIsHowToPlayModalOpen(true);
            setIsBetsModalOpen(false);
        } 
        else if (modal === 'bets') {
            setIsBetsModalOpen(true);
            setIsHowToPlayModalOpen(false);
        }
        else {
            setIsHowToPlayModalOpen(false);
            setIsBetsModalOpen(false);
        }
    }, [modal]);
    
    const closeModal = () => {
        setIsHowToPlayModalOpen(false);
        setIsBetsModalOpen(false);
        router.push(router.pathname, undefined, { shallow: true });
    };

    return (
        <>
       <Head>
        <title>Free Dice by Broflip</title>
        <meta
          content="Free Dice trial by Broflip"
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
                                type="number" 
                                value={bet} 
                                readOnly
                                className="text-center bg-gray-400 text-black rounded-sm py-1 w-full"
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
                            type="number" 
                            value={bet} 
                            readOnly
                            className="text-center bg-gray-400 text-black rounded-sm py-1 w-full"
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
                                onClick={handlePlayAgain}
                                className={`${outcome.won ? ("bg-green-300") : ("bg-gray-300")} rounded-xl w-2/3 sm:w-1/3 p-2 text-black flex justify-center`}
                            >
                                Play Again
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
                <Link href="/dice" className="text-white">
                                  Play For Real
                                </Link>
            </div>
            <Modal isOpen={isHowToPlayModalOpen} onClose={closeModal}>
        <div className="mt-2 text-lg/6 text-white/70">
          <ol className="list-decimal list-inside text-gray-300">
            <li>Choose a multiplier with the slider</li>
            <li>Click roll to start the game</li>
            <li>Wait for the outcome</li>
            <li>Play again to continue</li>
          </ol>
          <p className="mt-4 text-sm text-gray-300">
            This is a demo version with no real betting. The bet amount is always 0.
          </p>
        </div>
      </Modal>
      <Modal isOpen={isBetsModalOpen} onClose={closeModal}>
        <div className='flex flex-row justify-between mt-2 text-white items-center'>
        <p>Demo mode - no real bets</p>
        </div>
      </Modal>
        </>
    );
}

export default Roll;
