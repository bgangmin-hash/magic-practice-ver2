'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Home, Shuffle, Eye, EyeOff, Wand2, Sparkles, Layers } from 'lucide-react';

const SETTINGS_KEY = 'magic-practice-settings';
const STACK_TRAINER_KEY = 'magic-practice-stack-trainer';

const CARD_SUITS = ['C', 'H', 'S', 'D'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const FULL_DECK = CARD_SUITS.flatMap((suit) => RANKS.map((rank) => `${rank}${suit}`));

const MNEMONICA_STACK = [
  '4C', '2H', '7D', '3C', '4H', '6D', 'AS', '5H', '9S', '2S', 'QH', '3D', 'QC',
  '8H', '6S', '5S', '9H', 'KC', '2D', 'JH', '3S', '8S', '6H', '10C', '5D', 'KD',
  '2C', '3H', '8D', '5C', 'KS', 'JD', '8C', '10S', 'KH', 'JC', '7S', '10H', 'AD',
  '4S', '7H', '4D', 'AC', '9C', 'JS', 'QD', '7C', 'QS', '10D', '6C', 'AH', '9D',
];

const EIGHT_KINGS_RANKS = ['8', 'K', '3', '10', '2', '7', '9', '5', 'Q', '4', 'A', '6', 'J'];

const generateEightKings = (suitOrder = ['C', 'H', 'S', 'D']) => {
  const cards = [];
  for (let i = 0; i < 52; i += 1) {
    const rank = EIGHT_KINGS_RANKS[i % 13];
    const suit = suitOrder[i % 4];
    cards.push(`${rank}${suit}`);
  }
  return cards;
};

const normalizeCardInput = (value = '') => {
  const upper = String(value).trim().toUpperCase().replace(/\s+/g, '');
  return upper
    .replace(/♣/g, 'C')
    .replace(/♥/g, 'H')
    .replace(/♡/g, 'H')
    .replace(/♠/g, 'S')
    .replace(/♤/g, 'S')
    .replace(/♦/g, 'D')
    .replace(/◇/g, 'D')
    .replace(/^1([CHSD])$/, 'A$1')
    .replace(/^11([CHSD])$/, 'J$1')
    .replace(/^12([CHSD])$/, 'Q$1')
    .replace(/^13([CHSD])$/, 'K$1');
};

const parseCards = (input = '') => input
  .split(/[\n,]+/)
  .map(normalizeCardInput)
  .filter((card) => /^(A|2|3|4|5|6|7|8|9|10|J|Q|K)[CHSD]$/.test(card));

const formatCard = (card = '') => {
  const normalized = normalizeCardInput(card);
  const suit = normalized.slice(-1);
  const rank = normalized.slice(0, -1);
  const suitSymbol = { C: '♣', H: '♥', S: '♠', D: '♦' }[suit] || suit;
  return `${rank}${suitSymbol}`;
};

const cardColor = (card, theme) => {
  const suit = normalizeCardInput(card).slice(-1);
  if (suit === 'H' || suit === 'D') return '#ff7d7d';
  return theme.text;
};

const loadJson = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const saveJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('저장 실패', e);
  }
};

const getDefaultAcanState = () => ({
  selectedDeck: 'mnemonica',
  customInput: '',
  eightKingsSuitOrder: 'C,H,S,D',
});

const getCardsForDeck = (state) => {
  if (state.selectedDeck === 'mnemonica') return MNEMONICA_STACK;
  if (state.selectedDeck === 'custom') return parseCards(state.customInput).slice(0, 52);
  const suitOrder = String(state.eightKingsSuitOrder || 'C,H,S,D')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => CARD_SUITS.includes(s));
  const safeSuitOrder = suitOrder.length === 4 ? suitOrder : ['C', 'H', 'S', 'D'];
  return generateEightKings(safeSuitOrder);
};

const getDeckLabel = (selectedDeck) => ({
  mnemonica: '네모니카',
  eightKings: '8 Kings',
  custom: '커스텀',
}[selectedDeck] || '네모니카');

const makeScenario = () => ({
  card: FULL_DECK[Math.floor(Math.random() * FULL_DECK.length)],
  namedNumber: Math.floor(Math.random() * 52) + 1,
});

const SectionTitle = ({ icon: Icon, title, subtitle }) => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', margin: '26px 0 12px' }}>
    <Icon size={18} style={{ color: '#d4af37', marginTop: 2, flexShrink: 0 }} />
    <div>
      <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
      {subtitle && <div style={{ color: 'var(--sub)', fontSize: 12, lineHeight: 1.55, marginTop: 3 }}>{subtitle}</div>}
    </div>
  </div>
);

export default function AcanTrainerPage() {
  const [settings, setSettings] = useState({ theme: 'dark', sound: true });
  const [state, setState] = useState(getDefaultAcanState());
  const [scenario, setScenario] = useState(makeScenario());
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    setSettings(loadJson(SETTINGS_KEY, { theme: 'dark', sound: true }));
    const savedStack = loadJson(STACK_TRAINER_KEY, getDefaultAcanState());
    setState({ ...getDefaultAcanState(), ...savedStack });
  }, []);

  const theme = useMemo(() => {
    const dark = settings.theme !== 'light';
    return {
      dark,
      bg: dark
        ? 'radial-gradient(ellipse at top, #1a1430 0%, #0a0815 50%, #050308 100%)'
        : 'radial-gradient(ellipse at top, #fff8e7 0%, #f7efe0 50%, #efe3cd 100%)',
      card: dark
        ? 'linear-gradient(180deg, rgba(40, 30, 60, 0.76) 0%, rgba(25, 20, 40, 0.76) 100%)'
        : 'linear-gradient(180deg, rgba(255, 252, 244, 0.88) 0%, rgba(248, 238, 219, 0.88) 100%)',
      softCard: dark
        ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.18) 0%, rgba(212, 175, 55, 0.04) 100%)'
        : 'linear-gradient(135deg, rgba(212, 175, 55, 0.22) 0%, rgba(255, 255, 255, 0.42) 100%)',
      text: dark ? '#f4e4c1' : '#2d2418',
      sub: dark ? '#8a7a5a' : '#7a6545',
      dim: dark ? '#5a4a3a' : '#a68d62',
      gold: '#d4af37',
      border: 'rgba(212, 175, 55, 0.25)',
      inputBg: dark ? 'rgba(10, 8, 21, 0.65)' : 'rgba(255, 255, 255, 0.68)',
      shadow: dark ? '0 20px 60px rgba(0, 0, 0, 0.5)' : '0 20px 50px rgba(111, 83, 36, 0.16)',
    };
  }, [settings.theme]);

  const cards = useMemo(() => getCardsForDeck(state), [state]);
  const currentPosition = cards.indexOf(normalizeCardInput(scenario.card)) + 1;
  const difference = currentPosition ? scenario.namedNumber - currentPosition : null;

  const persistState = (next) => {
    setState(next);
    const savedStack = loadJson(STACK_TRAINER_KEY, {});
    saveJson(STACK_TRAINER_KEY, { ...savedStack, ...next });
  };

  const nextScenario = () => {
    setScenario(makeScenario());
    setShowInfo(false);
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    background: theme.inputBg,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    padding: '11px 12px',
    outline: 'none',
  };

  const smallButtonStyle = (active = false) => ({
    background: active ? 'linear-gradient(135deg, #d4af37 0%, #9c7c1f 100%)' : theme.inputBg,
    color: active ? '#1a1430' : theme.text,
    border: active ? 'none' : `1px solid ${theme.border}`,
    borderRadius: 999,
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 900,
  });

  const deckButtonStyle = (deck) => ({
    ...smallButtonStyle(state.selectedDeck === deck),
    minWidth: 104,
  });

  return (
    <div style={{ '--sub': theme.sub, fontFamily: "'Manrope', sans-serif", background: theme.bg, minHeight: '100vh', color: theme.text, padding: '24px 18px 48px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        button, input, textarea, select { font-family: inherit; }
        @media (max-width: 720px) {
          .acan-shell { padding: 20px 14px !important; border-radius: 22px !important; }
          .acan-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: theme.dark ? 0.28 : 0.18 }}>
        {[...Array(42)].map((_, i) => (
          <div key={i} style={{ position: 'absolute', top: `${(i * 37) % 100}%`, left: `${(i * 53) % 100}%`, width: `${(i % 3) + 1}px`, height: `${(i % 3) + 1}px`, background: theme.gold, borderRadius: '50%', opacity: 0.55 }} />
        ))}
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          <button onClick={() => { window.location.href = '/'; }} style={smallButtonStyle(false)}><Home size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />메인으로</button>
          <button onClick={() => { window.location.href = '/stack'; }} style={smallButtonStyle(false)}><Layers size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Stack Trainer</button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, color: theme.gold, marginBottom: 8 }}>
            <Wand2 size={20} />
            <span style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.16em', fontWeight: 800 }}>ACAN TRAINER</span>
            <Wand2 size={20} />
          </div>
          <h1 style={{ margin: 0, fontFamily: "'Cinzel', serif", fontSize: 'clamp(30px, 6vw, 52px)', lineHeight: 1.08 }}>아칸 연습</h1>
          <p style={{ margin: '12px auto 0', maxWidth: 620, color: theme.sub, lineHeight: 1.65, fontSize: 14 }}>
            관객이 자유롭게 말한 카드와 숫자를 상상하고, 현재 스택 기준으로 어떻게 처리할지 머릿속으로 리허설합니다.
          </p>
        </div>

        <main className="acan-shell" style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 28, padding: 28, boxShadow: theme.shadow }}>
          <SectionTitle icon={Sparkles} title="덱 선택" subtitle="현재 위치와 차이는 선택한 덱 기준으로 계산됩니다." />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <button onClick={() => persistState({ ...state, selectedDeck: 'mnemonica' })} style={deckButtonStyle('mnemonica')}>네모니카</button>
            <button onClick={() => persistState({ ...state, selectedDeck: 'eightKings' })} style={deckButtonStyle('eightKings')}>8 Kings</button>
            <button onClick={() => persistState({ ...state, selectedDeck: 'custom' })} style={deckButtonStyle('custom')}>커스텀</button>
          </div>

          {state.selectedDeck === 'eightKings' && (
            <div style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 12, marginBottom: 14 }}>
              <div style={{ color: theme.sub, fontSize: 12, marginBottom: 8 }}>8 Kings 수트 순서</div>
              <input value={state.eightKingsSuitOrder || 'C,H,S,D'} onChange={(e) => persistState({ ...state, eightKingsSuitOrder: e.target.value })} style={inputStyle} placeholder="C,H,S,D" />
            </div>
          )}

          {state.selectedDeck === 'custom' && (
            <div style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 12, marginBottom: 14 }}>
              <div style={{ color: theme.sub, fontSize: 12, marginBottom: 8 }}>커스텀 덱 입력</div>
              <textarea value={state.customInput || ''} onChange={(e) => persistState({ ...state, customInput: e.target.value })} placeholder="예: 4C, 2H, 7D ... / 쉼표 또는 줄바꿈으로 52장을 입력" rows={5} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
              <div style={{ color: cards.length === 52 ? theme.sub : '#ff9b9b', fontSize: 12, marginTop: 8 }}>현재 {cards.length} / 52장</div>
            </div>
          )}

          <SectionTitle icon={Shuffle} title="랜덤 상황" subtitle="다음 버튼을 누를 때마다 새로운 카드와 숫자가 나옵니다." />
          <div style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 20, padding: 18 }}>
            <div className="acan-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div style={{ background: theme.softCard, border: `1px solid ${theme.border}`, borderRadius: 18, padding: '26px 12px', textAlign: 'center' }}>
                <div style={{ color: theme.sub, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12 }}>Named Card</div>
                <div style={{ color: cardColor(scenario.card, theme), fontSize: 'clamp(48px, 12vw, 82px)', fontWeight: 900, lineHeight: 1 }}>{formatCard(scenario.card)}</div>
                <div style={{ color: theme.sub, fontSize: 12, marginTop: 12 }}>관객이 부른 카드</div>
              </div>
              <div style={{ background: theme.softCard, border: `1px solid ${theme.border}`, borderRadius: 18, padding: '26px 12px', textAlign: 'center' }}>
                <div style={{ color: theme.sub, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 12 }}>Named Number</div>
                <div style={{ color: theme.gold, fontSize: 'clamp(48px, 12vw, 82px)', fontWeight: 900, lineHeight: 1 }}>{scenario.namedNumber}</div>
                <div style={{ color: theme.sub, fontSize: 12, marginTop: 12 }}>관객이 부른 숫자</div>
              </div>
            </div>

            {showInfo && (
              <div className="acan-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: 14, background: theme.softCard }}>
                  <div style={{ color: theme.sub, fontSize: 11 }}>현재 스택 위치</div>
                  <div style={{ color: currentPosition ? theme.gold : '#ff9b9b', fontWeight: 900, fontSize: 24, marginTop: 4 }}>{currentPosition || '없음'}</div>
                  <div style={{ color: theme.sub, fontSize: 12, marginTop: 4 }}>{getDeckLabel(state.selectedDeck)} 기준</div>
                </div>
                <div style={{ border: `1px solid ${theme.border}`, borderRadius: 14, padding: 14, background: theme.softCard }}>
                  <div style={{ color: theme.sub, fontSize: 11 }}>목표 숫자와의 차이</div>
                  <div style={{ color: difference === null ? '#ff9b9b' : theme.gold, fontWeight: 900, fontSize: 24, marginTop: 4 }}>{difference === null ? '계산 불가' : difference > 0 ? `+${difference}` : difference}</div>
                  <div style={{ color: theme.sub, fontSize: 12, marginTop: 4 }}>목표 숫자 - 현재 위치</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setShowInfo(!showInfo)} style={smallButtonStyle(showInfo)}>{showInfo ? <EyeOff size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> : <Eye size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />}{showInfo ? '위치/차이 숨기기' : '위치/차이 보기'}</button>
              <button onClick={nextScenario} style={smallButtonStyle(true)}><Shuffle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />다음</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
