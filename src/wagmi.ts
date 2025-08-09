import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { webSocket } from 'wagmi';
import {
  sei
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'pixelcoinflip',
  projectId: '099e8b5b34a2d1e39fbe28772f347981',
  chains: [
    sei
  ],
  ssr: true,
  transports: {
    [sei.id]: webSocket('wss://sei-mainnet.g.alchemy.com/v2/YUnppYpYem2Jf6S6s_6wVgOC8EQEw-4L'),
    
  },
});
