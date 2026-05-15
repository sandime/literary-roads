// The Trading Post — checkout. An old-fashioned receipt rolling out of a till,
// with Stripe-styled pay button + Printful shipping note.

function ReceiptLine({ qty, name, sub, price, accent }) {
  return (
    <div style={{ padding: '10px 0', borderTop: `1px dotted ${TP.ink}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 28, fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12, color: TP.inkSoft,
        }}>{String(qty).padStart(2,'0')}×</div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: '"Fraunces", serif', fontWeight: 600,
            fontSize: 14, color: TP.ink, lineHeight: 1.2,
          }}>{name}</div>
          {sub && (
            <div style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10, color: TP.inkMute, marginTop: 2, letterSpacing: '0.04em',
            }}>{sub}</div>
          )}
        </div>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: TP.ink,
          minWidth: 50, textAlign: 'right', fontWeight: 500,
        }}>${price.toFixed(2)}</div>
      </div>
    </div>
  );
}

function FieldRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{
        fontFamily: '"IM Fell English SC", serif',
        fontSize: 10, letterSpacing: '0.16em', color: TP.inkSoft,
      }}>{label}</span>
      <span style={{
        fontFamily: mono ? '"JetBrains Mono", monospace' : '"Fraunces", serif',
        fontSize: mono ? 11 : 13, color: TP.ink,
      }}>{value}</span>
    </div>
  );
}

function TradingPostCheckout() {
  const items = [
    { q: 1, n: 'The Neon Roadcat',         s: 'bookmark · foil + tassel',   p: 12.00 },
    { q: 2, n: 'Mile Marker Journal',      s: 'journal · forest · 5×8 in',  p: 28.00 },
    { q: 1, n: 'Star-Cat Decal Pack',      s: 'stickers · ten count',       p: 4.00 },
  ];
  const subtotal = items.reduce((s,i) => s + i.q * i.p, 0);
  const shipping = 4.50;
  const tax = +(subtotal * 0.069).toFixed(2);
  const total = +(subtotal + shipping + tax).toFixed(2);

  return (
    <div style={{
      width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden',
      background: TP.paper, position: 'relative',
    }}>
      <PaperTexture opacity={0.05} />

      <ShopHeader sub="✦ THE TILL ✦" />

      {/* receipt paper */}
      <div style={{
        margin: '6px 18px 0', position: 'relative',
      }}>
        {/* paper roll dispenser stub at top */}
        <div style={{
          height: 10, background: `linear-gradient(180deg, ${TP.wood2}, ${TP.wood3})`,
          border: `1.5px solid ${TP.ink}`, borderBottom: 'none',
          borderTopLeftRadius: 4, borderTopRightRadius: 4,
          position: 'relative', zIndex: 2,
        }}>
          {/* serration */}
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: -6, height: 6,
            background: `linear-gradient(${TP.paper3}, ${TP.paper3})`,
            clipPath: 'polygon(0 0, 4% 100%, 8% 0, 12% 100%, 16% 0, 20% 100%, 24% 0, 28% 100%, 32% 0, 36% 100%, 40% 0, 44% 100%, 48% 0, 52% 100%, 56% 0, 60% 100%, 64% 0, 68% 100%, 72% 0, 76% 100%, 80% 0, 84% 100%, 88% 0, 92% 100%, 96% 0, 100% 100%)',
          }} />
        </div>

        <div style={{
          background: TP.paper3,
          padding: '18px 16px 14px',
          border: `1.5px solid ${TP.ink}`,
          borderTop: 'none',
          boxShadow: `3px 3px 0 ${TP.ink}, 0 12px 24px rgba(27,31,42,0.15)`,
          position: 'relative',
        }}>
          {/* receipt header */}
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{
              fontFamily: '"IM Fell English SC", serif',
              fontSize: 14, letterSpacing: '0.22em', color: TP.ink,
            }}>THE TRADING POST</div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10, color: TP.inkMute, letterSpacing: '0.08em', marginTop: 2,
            }}>ORDER #LR-2026-04-117 · MAY 12, 2026 · 09:41</div>
            <div style={{ height: 1, background: TP.ink, margin: '8px 0', opacity: 0.85 }} />
            <div style={{
              fontFamily: '"Fraunces", serif', fontStyle: 'italic',
              fontSize: 12, color: TP.inkSoft,
            }}>“Three items, fairly chosen. Thank you kindly.”</div>
          </div>

          {/* line items */}
          <div>
            {items.map((it, i) => (
              <ReceiptLine key={i} qty={it.q} name={it.n} sub={it.s} price={it.q * it.p} />
            ))}
          </div>

          {/* totals */}
          <div style={{ marginTop: 8, borderTop: `1px solid ${TP.ink}`, paddingTop: 8 }}>
            <FieldRow label="SUBTOTAL"  value={`$${subtotal.toFixed(2)}`} mono />
            <FieldRow label="SHIPPING"  value={`$${shipping.toFixed(2)}`} mono />
            <FieldRow label="TAX · MO"  value={`$${tax.toFixed(2)}`} mono />
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 8, padding: '10px 0',
            borderTop: `2px solid ${TP.ink}`,
            borderBottom: `2px solid ${TP.ink}`,
          }}>
            <span style={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: 22, color: TP.ink, fontStyle: 'italic',
            }}>Total</span>
            <MileageMarker price={`$${total.toFixed(0)}`} scale={0.85} tilt={-3} label={`. ${(total % 1 * 100).toFixed(0).padStart(2,'0')} USD`} />
          </div>

          {/* SHIP TO + PAY WITH cards */}
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              padding: '10px 12px',
              background: TP.paper,
              border: `1.5px dashed ${TP.ink}`,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 6,
              }}>
                <span style={{
                  fontFamily: '"IM Fell English SC", serif',
                  fontSize: 11, letterSpacing: '0.2em', color: TP.ink,
                }}>SHIP TO</span>
                <button style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 11,
                  color: TP.ink, textDecoration: 'underline',
                  textDecorationColor: TP.postRed, textDecorationThickness: 1.5,
                  textUnderlineOffset: 3, padding: 0,
                }}>edit</button>
              </div>
              <div style={{ fontFamily: '"Fraunces", serif', fontSize: 13, lineHeight: 1.4, color: TP.ink }}>
                Eliza Hart<br/>
                418 Mile-Marker Lane<br/>
                Lawrence, KS 66044
              </div>
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Stamp tilt={-3} color={TP.teal}>
                  <span style={{ color: TP.ink }}>PRINTFUL · KC FULFILLMENT</span>
                </Stamp>
                <span style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
                  color: TP.inkMute, letterSpacing: '0.04em',
                }}>arrives may 18–22</span>
              </div>
            </div>

            <div style={{
              padding: '10px 12px',
              background: TP.paper,
              border: `1.5px dashed ${TP.ink}`,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 6,
              }}>
                <span style={{
                  fontFamily: '"IM Fell English SC", serif',
                  fontSize: 11, letterSpacing: '0.2em', color: TP.ink,
                }}>PAY WITH</span>
                <span style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
                  color: TP.inkMute, letterSpacing: '0.1em',
                }}>SECURED · STRIPE</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 36, height: 24, borderRadius: 3,
                  background: '#635BFF', border: `1.5px solid ${TP.ink}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: '"Space Grotesk", sans-serif', fontWeight: 700,
                  fontSize: 11, color: '#fff', letterSpacing: '0.02em',
                }}>STR</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: '"Fraunces", serif', fontSize: 13, color: TP.ink }}>
                    Visa ending 4242
                  </div>
                  <div style={{
                    fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
                    color: TP.inkMute, letterSpacing: '0.04em',
                  }}>or use Apple Pay · Link · card</div>
                </div>
                <button style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: '"Space Grotesk", sans-serif', fontSize: 11,
                  color: TP.ink, textDecoration: 'underline',
                  textDecorationColor: TP.postRed, textDecorationThickness: 1.5,
                  textUnderlineOffset: 3, padding: 0,
                }}>change</button>
              </div>
            </div>
          </div>

          {/* PAY button — sticker style, Stripe gradient */}
          <button style={{
            marginTop: 14, width: '100%', height: 52,
            background: 'linear-gradient(180deg, #7A6BFF 0%, #635BFF 100%)',
            color: '#fff',
            border: `1.5px solid ${TP.ink}`,
            boxShadow: `3px 3px 0 ${TP.ink}`,
            fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600,
            fontSize: 15, letterSpacing: '0.04em', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span>Pay ${total.toFixed(2)}</span>
            <span style={{ opacity: 0.75 }}>·</span>
            <span style={{ opacity: 0.85, fontSize: 11, letterSpacing: '0.12em' }}>STRIPE CHECKOUT →</span>
          </button>

          {/* fine print */}
          <p style={{
            marginTop: 10,
            fontFamily: '"Fraunces", serif', fontStyle: 'italic',
            fontSize: 11, lineHeight: 1.45, color: TP.inkSoft, textAlign: 'center',
            textWrap: 'pretty',
          }}>
            By tapping pay, you trust us to wrap your goods in brown paper,
            tie them with twine, &amp; mail them honestly.
          </p>

          {/* paid stamp */}
          <div style={{
            position: 'absolute', right: -8, bottom: 80, transform: 'rotate(-12deg)',
            opacity: 0.18, pointerEvents: 'none',
          }}>
            <div style={{
              border: `3px solid ${TP.postRed}`,
              borderRadius: 4,
              padding: '4px 12px',
              fontFamily: '"DM Serif Display", serif',
              fontSize: 36, color: TP.postRed, letterSpacing: '0.04em',
            }}>READY</div>
          </div>
        </div>

        {/* receipt tear-off bottom */}
        <div style={{ height: 14, position: 'relative' }}>
          <div style={{
            height: 8,
            background: `linear-gradient(${TP.paper3}, ${TP.paper3})`,
            clipPath: 'polygon(0 0, 4% 100%, 8% 0, 12% 100%, 16% 0, 20% 100%, 24% 0, 28% 100%, 32% 0, 36% 100%, 40% 0, 44% 100%, 48% 0, 52% 100%, 56% 0, 60% 100%, 64% 0, 68% 100%, 72% 0, 76% 100%, 80% 0, 84% 100%, 88% 0, 92% 100%, 96% 0, 100% 100%)',
            borderLeft: `1.5px solid ${TP.ink}`,
            borderRight: `1.5px solid ${TP.ink}`,
          }} />
        </div>
      </div>

      <div style={{ height: 30 }} />
    </div>
  );
}

window.TradingPostCheckout = TradingPostCheckout;
