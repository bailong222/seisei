import React, { useEffect, useState } from 'react';
import { ethers, formatEther } from 'ethers';
import { useAccount } from 'wagmi';

interface RollEvent {
  blockNumber: number;
  transactionHash: string;
  player: string;
  amount: bigint;
  choice: number;
  outcome: number;
  won: boolean;
  timestamp: number;
}

const ROLL_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'address', name: 'player', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'choice', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'outcome', type: 'uint256' },
      { indexed: false, internalType: 'bool', name: 'won', type: 'bool' }
    ],
    name: 'Roll',
    type: 'event'
  }
];

const ROLL_EVENT_TOPIC0 = ethers.id("Roll(address,uint256,uint256,uint256,bool)"); 

const SEI_RPC = 'https://sei-mainnet.g.alchemy.com/v2/YUnppYpYem2Jf6S6s_6wVgOC8EQEw-4L';
const CONTRACT_ADDRESS = '0xd60aF0bbE2C6EFeD5651Ef48feb0BF0d77323D9e';

const POLLING_INTERVAL = 10000; // 10 seconds
const TOTAL_BLOCKS_TO_CHECK = 2000; // Total number of blocks we want to check
const MAX_CHUNK_SIZE = 450; // Slightly below the 500 limit to be safe
const MAX_RESULTS = 20;

const PlayerEvents: React.FC = () => {
  const { address: currentAccount, isConnected } = useAccount();
  const [events, setEvents] = useState<RollEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !currentAccount) {
      setEvents([]);
      setLoading(false);
      return;
    }
    
    const provider = new ethers.JsonRpcProvider(SEI_RPC);
    const iface = new ethers.Interface(ROLL_EVENT_ABI);

    let isMounted = true;
    let pollingInterval: NodeJS.Timeout;

    const fetchRollEvents = async () => {
      try {
        if (isMounted) {
          setError(null);
          setLoading(true);
        }

        const latestBlock = await provider.getBlockNumber();
        if (!isMounted) return;

        const allLogs: ethers.Log[] = [];
        
        // Calculate how many chunks we need
        const startBlock = Math.max(latestBlock - TOTAL_BLOCKS_TO_CHECK, 0);
        const totalBlocksToScan = latestBlock - startBlock;
        const chunksNeeded = Math.ceil(totalBlocksToScan / MAX_CHUNK_SIZE);
        
        console.log(`Fetching logs from block ${startBlock} to ${latestBlock} in ${chunksNeeded} chunks`);

        // Fetch logs in chunks to stay within Alchemy's limits
        for (let i = 0; i < chunksNeeded && isMounted; i++) {
          const chunkStart = latestBlock - (i * MAX_CHUNK_SIZE) - MAX_CHUNK_SIZE;
          const chunkEnd = latestBlock - (i * MAX_CHUNK_SIZE);
          
          const fromBlock = Math.max(chunkStart, startBlock);
          const toBlock = chunkEnd;
          
          console.log(`Fetching chunk ${i+1}/${chunksNeeded}: blocks ${fromBlock} to ${toBlock}`);

          const logs = await provider.getLogs({
            address: CONTRACT_ADDRESS,
            fromBlock,
            toBlock,
            topics: [ROLL_EVENT_TOPIC0]
          });
          
          console.log(`Found ${logs.length} logs in chunk ${i+1}`);
          allLogs.push(...logs);
          
          // Small delay to avoid rate limiting
          if (i < chunksNeeded - 1) {
            await new Promise(r => setTimeout(r, 100));
          }
        }

        console.log(`Found ${allLogs.length} total logs`);
        if (!isMounted) return;

        const parsedEvents: RollEvent[] = [];

        for (const log of allLogs) {
          try {
            const parsedLog = iface.parseLog({
              topics: log.topics,
              data: log.data
            });
            
            if (!parsedLog) {
              console.error("Failed to parse log:", log);
              continue;
            }
            
            // Check if this event belongs to the current user
            const player = parsedLog.args.player.toLowerCase();
            if (player !== currentAccount.toLowerCase()) continue;
            
            // Fetch block for timestamp
            const block = await provider.getBlock(log.blockNumber);
            if (!block || !isMounted) continue;

            parsedEvents.push({
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash || "unknown",
              player: player,
              amount: parsedLog.args.amount,
              choice: Number(parsedLog.args.choice),
              outcome: Number(parsedLog.args.outcome),
              won: parsedLog.args.won,
              timestamp: Number(block.timestamp)
            });
          } catch (decodeErr) {
            console.error("Decode error:", decodeErr);
          }
        }

        if (isMounted) {
          // Sort by most recent first
          const playerEvents = parsedEvents
            .sort((a, b) => b.blockNumber - a.blockNumber)
            .slice(0, MAX_RESULTS);

          console.log(`Found ${playerEvents.length} events for player ${currentAccount}`);
          setEvents(playerEvents);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching events:", err);
          setError('Failed to fetch Sei EVM events');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRollEvents();
    pollingInterval = setInterval(fetchRollEvents, POLLING_INTERVAL);

    return () => {
      isMounted = false;
      clearInterval(pollingInterval);
    };
  }, [currentAccount, isConnected]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min${diff === 1 ? '' : 's'} ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hour${Math.floor(diff / 60) === 1 ? '' : 's'} ago`;
    return `${Math.floor(diff / 1440)} day${Math.floor(diff / 1440) === 1 ? '' : 's'} ago`;
  };

  if (loading && events.length === 0) return <div className="p-4 text-center">Loading events...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (!isConnected || !currentAccount) return <div className="p-4 text-center">Connect wallet to view your bets</div>;

  if (events.length === 0) {
    return <div className="p-4 text-center text-gray-500">
      No bets found for {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
    </div>;
  }

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <h2 className="text-xl mb-4">Your Recent Bets</h2>
      {events.map(ev => (
        <div key={ev.transactionHash} className="flex justify-between border-b border-gray-700 py-2">
          <span>{parseFloat(formatEther(ev.amount)).toFixed(4)} SEI</span>
          <span>{ev.choice === 0 ? 'Heads' : 'Tails'}</span>
          <span>{ev.outcome === 0 ? 'Heads' : 'Tails'}</span>
          <span className={ev.won ? 'text-green-400' : 'text-red-400'}>
            {ev.won ? 'Won' : 'Lost'}
          </span>
          <span className="text-gray-400">{formatTimestamp(ev.timestamp)}</span>
        </div>
      ))}
    </div>
  );
};

export default PlayerEvents;