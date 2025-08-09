import React, { useEffect, useState } from 'react';
import { ethers, formatEther } from 'ethers';
import { useAccount } from 'wagmi';

// Define the unified type for both dice and coinflip events
interface GameEvent {
  blockNumber: number;
  transactionHash: string;
  player: string;
  amount: bigint;
  choice: number;
  outcome: number;
  won: boolean;
  gameType: 'dice' | 'coinflip';
  timestamp: number;
}

// Define the ABI for the Roll event (same for both games)
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

// Contract addresses - updated to match the individual components
const DICE_CONTRACT_ADDRESS = "0xd60aF0bbE2C6EFeD5651Ef48feb0BF0d77323D9e";
const COINFLIP_CONTRACT_ADDRESS = "0xD0F83311d99e2DeC0517f49d31e1971590D5C09C";

const SEI_RPC = 'https://sei-mainnet.g.alchemy.com/v2/YUnppYpYem2Jf6S6s_6wVgOC8EQEw-4L';
const POLLING_INTERVAL = 10000; // 10 seconds
const TOTAL_BLOCKS_TO_CHECK = 2000; // Total number of blocks we want to check
const MAX_CHUNK_SIZE = 450; // Slightly below the 500 limit to be safe
const MAX_RESULTS = 50; // Show more results for combined view

const CombinedGameEvents: React.FC = () => {
  const { address: currentAccount, isConnected } = useAccount();
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEventsForContract = async (
    contractAddress: string,
    gameType: 'dice' | 'coinflip',
    provider: ethers.JsonRpcProvider,
    iface: ethers.Interface,
    startBlock: number,
    latestBlock: number,
    currentAccount: string
  ): Promise<GameEvent[]> => {
    const allLogs: ethers.Log[] = [];
    
    const totalBlocksToScan = latestBlock - startBlock;
    const chunksNeeded = Math.ceil(totalBlocksToScan / MAX_CHUNK_SIZE);
    
    console.log(`Fetching ${gameType} logs from block ${startBlock} to ${latestBlock} in ${chunksNeeded} chunks`);

    // Fetch logs in chunks to stay within Alchemy's limits
    for (let i = 0; i < chunksNeeded; i++) {
      const chunkStart = latestBlock - (i * MAX_CHUNK_SIZE) - MAX_CHUNK_SIZE;
      const chunkEnd = latestBlock - (i * MAX_CHUNK_SIZE);
      
      const fromBlock = Math.max(chunkStart, startBlock);
      const toBlock = chunkEnd;
      
      console.log(`Fetching ${gameType} chunk ${i+1}/${chunksNeeded}: blocks ${fromBlock} to ${toBlock}`);

      const logs = await provider.getLogs({
        address: contractAddress,
        fromBlock,
        toBlock,
        topics: [ROLL_EVENT_TOPIC0]
      });
      
      console.log(`Found ${logs.length} ${gameType} logs in chunk ${i+1}`);
      allLogs.push(...logs);
      
      // Small delay to avoid rate limiting
      if (i < chunksNeeded - 1) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    console.log(`Found ${allLogs.length} total ${gameType} logs`);

    const parsedEvents: GameEvent[] = [];

    for (const log of allLogs) {
      try {
        const parsedLog = iface.parseLog({
          topics: log.topics,
          data: log.data
        });
        
        if (!parsedLog) {
          console.error(`Failed to parse ${gameType} log:`, log);
          continue;
        }
        
        // Check if this event belongs to the current user (if account is provided)
        const player = parsedLog.args.player.toLowerCase();
        if (currentAccount && player !== currentAccount.toLowerCase()) continue;
        
        // Fetch block for timestamp
        const block = await provider.getBlock(log.blockNumber);
        if (!block) continue;

        parsedEvents.push({
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash || "unknown",
          player: player,
          amount: parsedLog.args.amount,
          choice: Number(parsedLog.args.choice),
          outcome: Number(parsedLog.args.outcome),
          won: parsedLog.args.won,
          gameType: gameType,
          timestamp: Number(block.timestamp)
        });
      } catch (decodeErr) {
        console.error(`Decode error for ${gameType}:`, decodeErr);
      }
    }

    return parsedEvents;
  };

  useEffect(() => {
    const provider = new ethers.JsonRpcProvider(SEI_RPC);
    const iface = new ethers.Interface(ROLL_EVENT_ABI);

    let isMounted = true;
    let pollingInterval: NodeJS.Timeout;

    const fetchAllEvents = async () => {
      try {
        if (isMounted) {
          setError(null);
          setLoading(true);
        }

        const latestBlock = await provider.getBlockNumber();
        if (!isMounted) return;

        const startBlock = Math.max(latestBlock - TOTAL_BLOCKS_TO_CHECK, 0);

        // Fetch events from both contracts in parallel
        const [diceEvents, coinflipEvents] = await Promise.all([
          fetchEventsForContract(
            DICE_CONTRACT_ADDRESS, 
            'dice', 
            provider, 
            iface, 
            startBlock, 
            latestBlock, 
            currentAccount || ''
          ),
          fetchEventsForContract(
            COINFLIP_CONTRACT_ADDRESS, 
            'coinflip', 
            provider, 
            iface, 
            startBlock, 
            latestBlock, 
            currentAccount || ''
          )
        ]);

        if (!isMounted) return;

        // Combine and sort all events
        const allEvents = [...diceEvents, ...coinflipEvents]
          .sort((a, b) => b.blockNumber - a.blockNumber)
          .slice(0, MAX_RESULTS);

        console.log(`Found ${allEvents.length} total events (${diceEvents.length} dice, ${coinflipEvents.length} coinflip)`);
        setEvents(allEvents);

      } catch (err) {
        if (isMounted) {
          console.error("Error fetching events:", err);
          setError('Failed to fetch Sei EVM events');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAllEvents();
    pollingInterval = setInterval(fetchAllEvents, POLLING_INTERVAL);

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

  // Helper function to format game-specific text
  const formatGameDescription = (event: GameEvent) => {
    const amount = parseFloat(formatEther(event.amount)).toFixed(2);
    const player = `${event.player?.slice(0, 6)}...${event.player?.slice(-4)}`;
    
    if (event.gameType === 'dice') {
      return `${player} bet ${amount} on ${event.choice}, rolled ${event.outcome} and ${event.won ? 'Won' : 'Lost'}`;
    } else {
      const choice = event.choice === 0 ? 'Heads' : 'Tails';
      const outcome = event.outcome === 0 ? 'Heads' : 'Tails';
      return `${player} bet ${amount} SEI on ${choice}, got ${outcome} and ${event.won ? 'Won' : 'Lost'}`;
    }
  };

  if (loading && events.length === 0) {
    return <div className="p-4 text-center text-blue-600">Loading events...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 text-center">Error: {error}</div>;
  }

  if (events.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
         No recent bets found
      </div>
    );
  }

  return (
    <div className="p-2 rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-white mb-4 text-center">
         RECENT BETS
        
      </h2>
      
      {/* Desktop table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border border-black rounded-lg">
          <thead>
            <tr className="border-b border-black">
              <th className="px-4 py-3 text-left text-yellow-300 font-medium">Game</th>
              <th className="px-4 py-3 text-left text-yellow-300 font-medium">Player</th>
              <th className="px-4 py-3 text-left text-yellow-300 font-medium">Amount</th>
              <th className="px-4 py-3 text-left text-yellow-300 font-medium">Choice</th>
              <th className="px-4 py-3 text-left text-yellow-300 font-medium">Outcome</th>
              <th className="px-4 py-3 text-left text-yellow-300 font-medium">Result</th>
              <th className="px-4 py-3 text-left text-yellow-300 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {events.slice(0, 12).map((event, index) => (
              <tr 
                key={event.transactionHash} 
                className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                  index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/50'
                }`}
              >
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    event.gameType === 'dice' 
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' 
                      : 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  }`}>
                    {event.gameType === 'dice' ? '🎲 Dice' : '🪙 Flip'}
                  </span>
                </td>
                <td className="px-4 py-3 text-white font-mono text-sm">
                  {event.player?.slice(0, 6)}...{event.player?.slice(-4)}
                </td>
                <td className="px-4 py-3 text-white">
                  {parseFloat(formatEther(event.amount)).toFixed(4)} SEI
                </td>
                <td className="px-4 py-3 text-white">
                  {event.gameType === 'dice' ? event.choice : (event.choice === 0 ? 'Heads' : 'Tails')}
                </td>
                <td className="px-4 py-3 text-white">
                  {event.gameType === 'dice' ? event.outcome : (event.outcome === 0 ? 'Heads' : 'Tails')}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    event.won 
                      ? 'bg-green-600/20 text-green-300 border border-green-500/30' 
                      : 'bg-red-600/20 text-red-300 border border-red-500/30'
                  }`}>
                    {event.won ? '✅ Won' : '❌ Lost'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm">
                  {formatTimestamp(event.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="block md:hidden">
        <div className="space-y-3">
          {events.slice(0, 10).map((event, index) => (
            <div 
              key={event.transactionHash} 
              className={`p-4 rounded-lg border border-gray-700/50 ${
                index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/50'
              }`}
            >
              {/* Header row with game type and result */}
              <div className="flex justify-between items-center mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  event.gameType === 'dice' 
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' 
                    : 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                }`}>
                  {event.gameType === 'dice' ? '🎲 Dice' : '🪙 Flip'}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  event.won 
                    ? 'bg-green-600/20 text-green-300 border border-green-500/30' 
                    : 'bg-red-600/20 text-red-300 border border-red-500/30'
                }`}>
                  {event.won ? '✅ Won' : '❌ Lost'}
                </span>
              </div>
              
              {/* Player and amount */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-yellow-300 text-xs font-medium mb-1">Player</div>
                  <div className="text-white font-mono text-sm">
                    {event.player?.slice(0, 6)}...{event.player?.slice(-4)}
                  </div>
                </div>
                <div>
                  <div className="text-yellow-300 text-xs font-medium mb-1">Amount</div>
                  <div className="text-white text-sm font-semibold">
                    {parseFloat(formatEther(event.amount)).toFixed(4)} SEI
                  </div>
                </div>
              </div>
              
              {/* Choice and outcome */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-yellow-300 text-xs font-medium mb-1">Choice</div>
                  <div className="text-white text-sm">
                    {event.gameType === 'dice' ? event.choice : (event.choice === 0 ? 'Heads' : 'Tails')}
                  </div>
                </div>
                <div>
                  <div className="text-yellow-300 text-xs font-medium mb-1">Outcome</div>
                  <div className="text-white text-sm">
                    {event.gameType === 'dice' ? event.outcome : (event.outcome === 0 ? 'Heads' : 'Tails')}
                  </div>
                </div>
              </div>
              
              {/* Timestamp */}
              <div className="text-gray-400 text-xs">
                {formatTimestamp(event.timestamp)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alternative compact view for mobile */}
      <div className="hidden mt-4">
        <div className="space-y-3 border border-yellow-700 p-2 rounded">
          {events.slice(0, 8).map((event) => (
            <div key={event.transactionHash} className="p-2 bg-gray-800/50 rounded-md">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  event.gameType === 'dice' 
                    ? 'bg-blue-600/20 text-blue-300' 
                    : 'bg-purple-600/20 text-purple-300'
                }`}>
                  {event.gameType === 'dice' ? '🎲' : '🪙'}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  event.won 
                    ? 'bg-green-600/20 text-green-300' 
                    : 'bg-red-600/20 text-red-300'
                }`}>
                  {event.won ? 'Won' : 'Lost'}
                </span>
              </div>
              <p className="text-white text-sm">
                {formatGameDescription(event)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CombinedGameEvents;
