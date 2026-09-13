"use client";

// Plain wallet-connect state, shared across the app via React context.
// Kept deliberately simple (one address, connect/disconnect) since a
// beginner-facing dashboard has no reason to expose more wallet concepts
// than "connected" / "not connected".

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { connect, disconnect, getLocalStorage, isConnected } from "@stacks/connect";

type WalletState = {
  address: string | null;
  // BTC pubkey from the same connected wallet - used as the "reclaim" key
  // for sBTC deposits (see frontend/lib/sbtc.ts) so a beginner never has to
  // paste a raw public key in themselves.
  btcPublicKey: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletState | null>(null);

// getLocalStorage() intentionally strips publicKey before persisting (it's
// sensitive-ish and not needed for most flows), so the STX address can be
// restored from storage on reload, but the BTC public key - needed as the
// sBTC deposit "reclaim" key - can only come from a live connect() result.
// After a page reload, a beginner just needs to reconnect once before using
// the "Bring in Bitcoin" step; every other step only needs the STX address.
function readStxAddress(): string | null {
  const data = getLocalStorage();
  return data?.addresses.stx[0]?.address ?? null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [btcPublicKey, setBtcPublicKey] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (isConnected()) {
      setAddress(readStxAddress());
    }
  }, []);

  const doConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const result = await connect();
      const stx = result.addresses.find((a) => a.symbol === "STX")?.address ?? null;
      const btc = result.addresses.find((a) => a.symbol === "BTC")?.publicKey ?? null;
      setAddress(stx);
      setBtcPublicKey(btc);
    } finally {
      setConnecting(false);
    }
  }, []);

  const doDisconnect = useCallback(() => {
    disconnect();
    setAddress(null);
    setBtcPublicKey(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{ address, btcPublicKey, connecting, connect: doConnect, disconnect: doDisconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
