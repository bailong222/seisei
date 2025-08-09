import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/router";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

function Header() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect if on mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 750);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const openModal = (modalType: string) => {
    router.push(
      {
        pathname: router.pathname,
        query: { modal: modalType },
      },
      undefined,
      { shallow: true }
    );
  };

  let link;
  if (router.pathname === "/flip") {
    link = (
      <Link
        href="/dice"
        className="text-xl text-white hover:bg-blue-200/20 font-bold py-2 px-4 rounded mr-2 transition duration-200 shadow-lg"
      >
        {isMobile ? "Dice" : "🎲 Dice"}
      </Link>
    );
  } else if (router.pathname === "/flip/try") {
    link = (
      <Link
        href="/flip"
        className="text-xl text-white hover:bg-blue-200/20 font-bold py-2 px-4 rounded mr-2 transition duration-200 shadow-lg"
      >
        {isMobile ? "FLIP" : "🪙 FLIP"}
      </Link>
    );
  } else if (router.pathname === "/dice") {
    link = (
      <Link
        href="/flip"
        className="text-xl text-white hover:bg-blue-200/20 font-bold py-2 px-4 rounded mr-2 transition duration-200 shadow-lg"
      >
        {isMobile ? "FLIP" : "🪙 FLIP"}
      </Link>
    );
  } else if (router.pathname === "/dice/try") {
    link = (
      <Link
        href="/dice"
        className="text-xl text-white hover:bg-blue-200/20 font-bold py-2 px-4 rounded mr-2 transition duration-200 shadow-lg"
      >
        {isMobile ? "Dice" : "🎲 Dice"}
      </Link>
    );
  }

  return (
    <header className="text-white p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          {link}

          {(router.pathname === "/flip" || router.pathname === "/dice") && (
            <button
              onClick={() => openModal("bets")}
              className="text-xl text-white hover:bg-blue-200/20 font-bold py-2 px-4 rounded mr-2 transition duration-200 shadow-lg max-[750px]:hidden"
            >
              My Bets
            </button>
          )}
        </div>
        <div className="flex items-center flex-row">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="text-xl text-white hover:bg-blue-200/20 font-bold py-2 px-4 rounded mr-2 transition duration-200 shadow-lg flex items-center gap-2"
            >
              <Image src="/sei_icon.png" alt="Sonic" height={24} width={24} />
              Sei
              <svg
                className={`ml-2 h-4 w-4 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50">
                <div className="py-1">
                  <Link
                    href="https://sonic.broflip.com"
                    target="_blank"
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      setIsDropdownOpen(false);
                    }}
                  >
                    Sonic
                  </Link>
                </div>
              </div>
            )}
          </div>
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              return (
                <div
                  {...(!ready && {
                    "aria-hidden": true,
                    style: {
                      opacity: 0,
                      pointerEvents: "none",
                      userSelect: "none",
                    },
                  })}
                  className="hover:bg-blue-200/20 p-2 rounded text-xl"
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button onClick={openConnectModal} type="button">
                          Connect Wallet
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button onClick={openChainModal} type="button">
                          Wrong network
                        </button>
                      );
                    }

                    return (
                      <div style={{ display: "flex", gap: 12 }}>
                        <button
                          onClick={openAccountModal}
                          type="button"
                          style={{
                            border: "none",
                            background: "transparent",
                            outline: "none",
                            padding: 0,
                            boxShadow: "none",
                          }}
                        >
                          {account.displayBalance ? (
                            <span>{account.displayBalance}</span>
                          ) : (
                            <span>Loading Balance...</span>
                          )}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </header>
  );
}

export default Header;
