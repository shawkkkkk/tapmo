"use client";

import { useMemo, useState } from "react";

type Transaction = {
  merchant: string;
  detail: string;
  amount: number;
  status: "Completed" | "Pending";
};

const demoTransactions: Transaction[] = [
  { merchant: "McDonald's", detail: "Today · Apple Pay", amount: 12.48, status: "Completed" },
  { merchant: "Uber", detail: "Yesterday · Tapmo Card", amount: 21.16, status: "Completed" },
  { merchant: "Coffee", detail: "Sep 18 · Apple Pay", amount: 6.75, status: "Completed" },
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [balance, setBalance] = useState(143.62);

  const cardNumber = useMemo(
    () => (connected ? "••••  ••••  ••••  4827" : "••••  ••••  ••••  ••••"),
    [connected]
  );

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
          Connect your wallet, see what you can spend, and use Tapmo like a normal card.
        </p>

        {!connected ? (
          <button className="primary" onClick={() => setConnected(true)}>
            Connect Fomo Wallet
          </button>
        ) : (
          <div className="connectedPill">
            <span className="dot" />
            Wallet verified · 0x71F4…A92C
          </div>
        )}
      </section>

      <section className="dashboard">
        <div className="leftColumn">
          <div className="balancePanel">
            <div>
              <span className="label">SPENDABLE FOMO BALANCE</span>
              <div className="balance">{connected ? money(balance) : "$—"}</div>
            </div>
            <div className="status">
              <span className="dot" />
              {connected ? "Ready to spend" : "Connect wallet"}
            </div>
          </div>

          <div className={"card " + (frozen ? "cardFrozen" : "")}>
            <div className="cardTop">
              <div className="cardLogo">tapmo</div>
              <span className="cardBadge">VIRTUAL</span>
            </div>

            <div className="cardNumber">{cardNumber}</div>

            <div className="cardBottom">
              <div>
                <span>CARDHOLDER</span>
                <strong>{connected ? "TAPMO USER" : "—"}</strong>
              </div>
              <div>
                <span>VALID THRU</span>
                <strong>{connected ? "09/30" : "—"}</strong>
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
              Connect your wallet to see Tapmo activity.
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
          <p>Link and verify the wallet associated with your Fomo balance.</p>
        </div>
        <div>
          <span className="step">02</span>
          <h3>Load</h3>
          <p>Tapmo determines the amount currently eligible to spend.</p>
        </div>
        <div>
          <span className="step">03</span>
          <h3>Tap</h3>
          <p>Use the Tapmo card through supported digital wallets and merchants.</p>
        </div>
      </section>

      <footer>
        <span>Tapmo · Sandbox prototype</span>
        <span>No real funds or cards are used in this build.</span>
      </footer>
    </main>
  );
}
