'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent} from 'wagmi';
import { parseEther, Hex, formatEther } from 'viem';
import { ABI } from "../../components/coinflip-abi";
import Image from 'next/image';
import { readContract } from '@wagmi/core';
import { config } from '../wagmi';
import Head from 'next/head';
import Modal from '../../components/Modal';
import { useRouter } from 'next/router';
import PlayerEvents from "../../components/coinflipPlayerEvents"
import CombinedGameEvents from "../../components/combined-events"
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

const COIN_CONTRACT_ADDRESS: Hex = "0xD0F83311d99e2DeC0517f49d31e1971590D5C09C";

function CoinFlipGame() {
  const { isConnected } = useAccount();

  return (
    <>
      <Head>
        <title>Broflip | Decentralized gambling on Sonic</title>
        <meta
          content="Coinflip betting game on the Sonic blockchain. Decentralized and fair. Connect your wallet, flip and withdraw"
          name="description"
        />
        <link href="/favicon.png" rel="icon" />
      </Head>
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="flex flex-col justify-center items-center mx-auto w-full max-w-4xl px-4 py-4">
          {/* Main Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-4">
              BROFLIP
            </h1>
            <p className="text-xl md:text-2xl text-white mb-2">
              THE #1 PLACE TO FLIP
            </p>
          </div>
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <Image 
              src="/favicon.png" 
              height={200} 
              width={200} 
              alt='coin'
              className="relative hover:scale-110 transition-transform duration-300 drop-shadow-2xl"
            />
          </div>

          {!isConnected ? (
              <div className="flex justify-center text-xl text-white mb-20">
                <ConnectButton />
            </div>
          ) : (
            <div className="mb-20">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/flip" 
                  className='text-2xl sm:text-3xl text-white hover:bg-blue-200/20 font-bold py-3 px-6 rounded transition duration-200 shadow-lg text-center'
                >
                🪙 FLIP
                </Link>
                <Link 
                  href="/dice" 
                  className="text-2xl sm:text-3xl text-white hover:bg-blue-200/20 font-bold py-3 px-6 rounded transition duration-200 shadow-lg text-center"
                >
                 🎲 ROLL
                </Link>
              </div>
            </div>
          )}

  
            <CombinedGameEvents />
      
        </div>
      </div>
     
    </>
  );
}

export default CoinFlipGame;