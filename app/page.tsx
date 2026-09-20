"use client";

import { useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

type Transaction = {
  merchant: string;
  detail: string;
  amount: number;
  status: "Completed" | "Pending";
};

const demoTransactions: Transaction[] = [
  {
    merchant: "McDonald's",
    detail: "Today · Apple Pay",
    amount: 12.48,
    status: "Completed",
  },
  {
    merchant: "Uber",
    detail: "Yesterday · Tapmo Card",
    amount: 21.16,
    status: "Completed",
  },
  {
    merchant: "Coffee",
    detail: "Sep 18 · Apple Pay",
    amount: 6.75,
    status: "Completed",
  },
];

const privyConfigured = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function shortAddress(address?: string) {
  if (!address) return "";
  if (address.length < 11) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function Home() {
  return <PrivyTapmo />;
}

function PrivyTapmo() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const walletAddress = wallets[0]?.address;

  const connected = ready && walletsReady && authenticated && Boolean(walletAddress);

  return (
    <TapmoDashboard
      connected={connected}
      authReady={ready && walletsReady}
      walletAddress={walletAddress}
      onConnect={login}
      onDisconnect={logout}
    />
  );
}

function TapmoDashboard({
  connected,
  authReady,
  walletAddress,
  onConnect,
  onDisconnect,
}: {
  connected: boolean;
  authReady: boolean;
  walletAddress?: string;
  onConnect: () => void;
  onDisconnect: () => Promise<void>;
}) {
  const [frozen, setFrozen] = useState(false);
  const [balance, setBalance] = useState(143.62);

  const cardNumber = connected
    ? "••••  ••••  ••••  4827"
    : "••••  ••••  ••••  ••••";

  function simulatePurchase() {
    if (!connected || frozen || balance < 12.48) return;
    setBalance((current) => Number((current - 12.48).toFixed(2)));
  }

  return (
    <main>
      <nav className="nav">
        <div className="brand">
          <span className="brandMark">T</span>
          <span>tapmo</span>
        </div>
        <span className="beta">BETA</span>
      </nav>

      <section className="hero">
        <div className="eyebrow">FOMO → REAL WORLD</div>
        <h1>Tap your Fomo balance anywhere.</h1>
        <p className="subhead">
          Authenticate the wallet you use with Fomo, see a sandbox spendable
          balance, and preview the Tapmo card experience.
        </p>

        {!connected ? (
          <button
            className="primary"
            onClick={onConnect}
            disabled={!authReady}
          >
            {authReady ? "Connect Fomo Wallet" : "Loading wallet login…"}
          </button>
        ) : (
          <div className="walletControls">
            <div className="connectedPill">
              <span className="dot" />
              Wallet authenticated · {shortAddress(walletAddress)}
            </div>
            <button className="textButton" onClick={() => void onDisconnect()}>
              Disconnect
            </button>
          </div>
        )}
      </section>

      <section className="dashboard">
        <div className="leftColumn">
          <div className="balancePanel">
            <div>
              <span className="label">SANDBOX SPENDABLE BALANCE</span>
              <div className="balance">{connected ? money(balance) : "$—"}</div>
            </div>
            <div className="status">
              <span className="dot" />
              {connected ? "Wallet authenticated" : "Connect wallet"}
            </div>
          </div>

          <div className={"card " + (frozen ? "cardFrozen" : "")}>
            <div className="cardTop">
              <div className="cardLogo">tapmo</div>
              <span className="cardBadge">VIRTUAL · DEMO</span>
            </div>

            <div className="cardNumber">{cardNumber}</div>

            <div className="cardBottom">
              <div>
                <span>WALLET</span>
                <strong>{connected ? shortAddress(walletAddress).toUpperCase() : "—"}</strong>
              </div>
              <div>
                <span>STATUS</span>
                <strong>{connected ? "SANDBOX" : "—"}</strong>
              </div>
            </div>

            {frozen && <div className="freezeOverlay">CARD FROZEN</div>}
          </div>

          <div className="actions">
            <button className="darkButton" disabled={!connected}>
              Add to Apple Wallet
            </button>
            <button
              className="secondary"
              disabled={!connected}
              onClick={() => setFrozen((value) => !value)}
            >
              {frozen ? "Unfreeze card" : "Freeze card"}
            </button>
          </div>
        </div>

        <div className="activityPanel">
          <div className="panelHeader">
            <div>
              <span className="label">RECENT ACTIVITY</span>
              <h2>Transactions</h2>
            </div>
            <span className="demoTag">DEMO</span>
          </div>

          {!connected ? (
            <div className="emptyState">
              Authenticate your wallet to preview Tapmo activity.
            </div>
          ) : (
            <>
              <div className="transactions">
                {demoTransactions.map((tx) => (
                  <div className="transaction" key={tx.merchant + tx.detail}>
                    <div className="merchantIcon">{tx.merchant[0]}</div>
                    <div className="transactionText">
                      <strong>{tx.merchant}</strong>
                      <span>{tx.detail}</span>
                    </div>
                    <div className="amount">−{money(tx.amount)}</div>
                  </div>
                ))}
              </div>

              <div className="demoBox">
                <div>
                  <strong>Try the product flow</strong>
                  <span>Simulate a $12.48 McDonald's purchase.</span>
                </div>
                <button
                  onClick={simulatePurchase}
                  disabled={frozen || balance < 12.48}
                >
                  Simulate tap
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="how">
        <div>
          <span className="step">01</span>
          <h3>Connect</h3>
          <p>Privy authenticates control of the wallet you connect to Tapmo.</p>
        </div>
        <div>
          <span className="step">02</span>
          <h3>Verify</h3>
          <p>
            Next, Tapmo will match that wallet against supported Fomo wallet data
            and calculate eligible balance.
          </p>
        </div>
        <div>
          <span className="step">03</span>
          <h3>Tap</h3>
          <p>
            Later payment-rail integrations will turn eligible balance into
            ordinary card spending.
          </p>
        </div>
      </section>

      <footer>
        <span>Tapmo · Sandbox prototype</span>
        <span>
          Wallet authentication is real. Balance, card, and transactions are simulated.
        </span>
      </footer>
    </main>
  );
}
