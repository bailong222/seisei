import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import type { AppProps } from 'next/app';
import router from 'next/router';
import Link from 'next/link';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, Theme } from '@rainbow-me/rainbowkit';
import Header from '../../components/Header'
import { config } from '../wagmi';
import Footer from '../../components/Footer';
import {Tiny5} from 'next/font/google'
import { compact } from '@headlessui/react/dist/utils/render';

const client = new QueryClient();

const tiny5 = Tiny5({
      subsets: ['latin'],
      weight: ['400'],
      variable: '--font-tiny5',
    });
const myCustomTheme: Theme = {
  blurs: {
    modalOverlay: 'large',
  },
  colors: {
    accentColor: '...',
    accentColorForeground: '...',
    actionButtonBorder: 'rgba(0, 0, 0, 0)', // Ensure action button border is transparent
    actionButtonBorderMobile: 'rgba(0, 0, 0, 0)', // Ensure mobile action button border is transparent
    actionButtonSecondaryBackground: 'rgba(0, 0, 0, 0)', // Ensure secondary background is transparent
    closeButton: '...',
    closeButtonBackground: '...',
    connectButtonBackground: '...',
    connectButtonBackgroundError: '...',
    connectButtonInnerBackground: '...',
    connectButtonText: '...',
    connectButtonTextError: '...',
    connectionIndicator: '...',
    downloadBottomCardBackground: '...',
    downloadTopCardBackground: '...',
    error: '...',
    generalBorder: 'rgba(0, 0, 0, 0)', // Consider making general borders transparent
    generalBorderDim: 'rgba(0, 0, 0, 0)', // Consider making dimmed general borders transparent
    menuItemBackground: '...',
    modalBackdrop: '...',
    modalBackground: '#F0F0F0',
    modalBorder: 'rgba(0, 0, 0, 0)', // Make modal border transparent
    modalText: '...',
    modalTextDim: '...',
    modalTextSecondary: '...',
    profileAction: 'rgba(0, 0, 0, 0)',
    profileActionHover: 'rgba(162, 162, 162, 0.92)',
    profileForeground: 'rgba(0, 0, 0, 0)',
    selectedOptionBorder: 'rgba(0, 0, 0, 0)',
    standby: '...',
  },
  fonts: {
    body: 'Tiny5',
  },
  radii: {
    actionButton: '...',
    connectButton: '...',
    menuButton: '...',
    modal: '...',
    modalMobile: '...',
  },
  shadows: {
    connectButton: '...',
    dialog: '...',
    profileDetailsAction: '...',
    selectedOption: '...',
    selectedWallet: '...',
    walletLogo: '...',
  },
};
function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>
        <RainbowKitProvider modalSize="compact" theme={myCustomTheme}>
          
           <div className={`flex flex-col min-h-screen bg-[#252034] ${tiny5.variable}`}>
                <div>
                  <Header/>
                </div>
                <main className='flex-grow'>
                  <Component {...pageProps} />
                </main>       
                <Footer />
              </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MyApp;
