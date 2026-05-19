'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Wand2,
  Crown,
  Menu,
  X,
  BarChart3,
  BookOpen,
  Link as LinkIcon,
  Settings,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Download,
  Upload,
  Home,
  Flame,
  Trophy,
  Plus,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';

const STORAGE_KEY = 'magic-practice-data';
const NOTES_KEY = 'magic-practice-notes';
const ROUTINES_KEY = 'magic-practice-routines';
const SETTINGS_KEY = 'magic-practice-settings';
const STACK_TRAINER_KEY = 'magic-practice-stack-trainer';
const PRACTICE_SECONDS = 180; // 3분

const LEVEL_THRESHOLDS = [0, 30, 80, 150, 250, 400, 600, 900, 1300, 1800];

const PRACTICE_CATEGORIES = [
  '카드마술',
  '동전마술',
  '멘탈마술',
  '연출연습',
  '공연준비',
  '기타',
];

const RESOURCE_LINKS = [
  {
    title: '친구의 마술 채널',
    description: '추천 영상, 공연 기록, 렉처 후기 등을 모아둘 공간입니다.',
    url: '',
    label: 'YouTube 링크 넣기',
  },
  {
    title: '추천 마술샵',
    description: '카드, 동전, 클로즈업 도구 등 연습에 필요한 자료를 연결할 수 있습니다.',
    url: '',
    label: '네오매직 링크 넣기',
  },
  {
    title: '추천 자료',
    description: '책, 렉처, 블로그, 연습법 등 나중에 참고할 자료를 모아두는 자리입니다.',
    url: '',
    label: '자료 링크 넣기',
  },
];

const getLevelInfo = (totalSets) => {
  const totalExp = totalSets * 10;
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalExp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const maxThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  if (totalExp >= maxThreshold) {
    level = LEVEL_THRESHOLDS.length + Math.floor((totalExp - maxThreshold) / 500);
  }

  const currentLevelExp = level <= LEVEL_THRESHOLDS.length
    ? LEVEL_THRESHOLDS[level - 1]
    : maxThreshold + (level - LEVEL_THRESHOLDS.length) * 500;
  const nextLevelExp = level + 1 <= LEVEL_THRESHOLDS.length
    ? LEVEL_THRESHOLDS[level]
    : maxThreshold + (level + 1 - LEVEL_THRESHOLDS.length) * 500;

  const expInLevel = totalExp - currentLevelExp;
  const expNeeded = nextLevelExp - currentLevelExp;

  let rank;
  if (level <= 2) rank = '견습 마술사';
  else if (level <= 4) rank = '수련 마술사';
  else if (level <= 6) rank = '숙련 마술사';
  else if (level <= 8) rank = '마스터 마술사';
  else if (level <= 10) rank = '대마술사';
  else rank = '전설의 마술사';

  return {
    level,
    rank,
    totalExp,
    expInLevel,
    expNeeded,
    progress: (expInLevel / expNeeded) * 100,
  };
};

const getDateKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDateLabel = (dateKey) => {
  const [y, m, d] = dateKey.split('-');
  return `${Number(m)}/${Number(d)}`;
};

const getLast10Days = () => {
  const days = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      key: getDateKey(d),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      isToday: i === 0,
    });
  }
  return days;
};

const getStreak = (practiceData) => {
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = getDateKey(cursor);
    if ((practiceData[key] || 0) <= 0) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const getBestRecord = (practiceData) => {
  const entries = Object.entries(practiceData);
  if (entries.length === 0) return { date: '-', sets: 0 };
  const [date, sets] = entries.reduce((best, current) => current[1] > best[1] ? current : best, entries[0]);
  return { date, sets };
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

const playTone = (type = 'start', enabled = true) => {
  if (!enabled || typeof window === 'undefined') return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const ctx = new AudioContext();
  const notes = {
    start: [440, 660],
    complete: [523, 659, 784],
    level: [523, 659, 784, 1046],
  }[type] || [440];

  notes.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + index * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + index * 0.09 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.09 + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + index * 0.09);
    osc.stop(ctx.currentTime + index * 0.09 + 0.2);
  });
};

const getAchievements = ({ totalSets, streak, todaySets, notesCount, routines }) => {
  const completedRoutines = Object.values(routines || {})
    .flat()
    .filter((routine) => routine.done).length;

  return [
    { title: '첫 시전', description: '첫 세트 완료', unlocked: totalSets >= 1 },
    { title: '3일의 마법', description: '3일 연속 연습', unlocked: streak >= 3 },
    { title: '손끝의 감각', description: '총 30세트 완료', unlocked: totalSets >= 30 },
    { title: '집요한 마술사', description: '하루 5세트 완료', unlocked: todaySets >= 5 },
    { title: '기록하는 마술사', description: '깨달음 5개 작성', unlocked: notesCount >= 5 },
    { title: '루틴 설계자', description: '루틴 10개 완료', unlocked: completedRoutines >= 10 },
  ];
};


const CARD_SUITS = ['C', 'H', 'S', 'D'];
const SUIT_LABELS = { C: '♣', H: '♥', S: '♠', D: '♦' };
const SUIT_NAMES = { C: 'Clubs', H: 'Hearts', S: 'Spades', D: 'Diamonds' };
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_VALUES = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13 };

const MNEMONICA_STACK = [
  '4C', '2H', '7D', '3C', '4H', '6D', 'AS', '5H', '9S', '2S', 'QH', '3D', 'QC',
  '8H', '6S', '5S', '9H', 'KC', '2D', 'JH', '3S', '8S', '6H', '10C', '5D', 'KD',
  '2C', '3H', '8D', '5C', 'KS', 'JD', '8C', '10S', 'KH', 'JC', '7S', '10H', 'AD',
  '4S', '7H', '4D', 'AC', '9C', 'JS', 'QD', '7C', 'QS', '10D', '6C', 'AH', '9D',
];

const normalizeCardInput = (value = '') => {
  const upper = String(value).trim().toUpperCase().replace(/\s+/g, '');
  const normalized = upper
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
  const match = normalized.match(/^(A|[2-9]|10|J|Q|K)(C|H|S|D)$/);
  return match ? `${match[1]}${match[2]}` : normalized;
};

const formatCard = (card) => {
  const normalized = normalizeCardInput(card);
  const match = normalized.match(/^(A|[2-9]|10|J|Q|K)(C|H|S|D)$/);
  if (!match) return card || '?';
  return `${match[1]}${SUIT_LABELS[match[2]]}`;
};

const cardColor = (card, theme) => {
  const suit = normalizeCardInput(card).slice(-1);
  if (suit === 'H' || suit === 'D') return '#ff6b6b';
  return theme.text;
};

const parseCards = (text = '') => text
  .split(/[\n,]+/)
  .map((v) => normalizeCardInput(v))
  .filter(Boolean);

const EIGHT_KINGS_RANKS = ['8', 'K', '3', '10', '2', '7', '9', '5', 'Q', '4', 'A', '6', 'J'];

const generateEightKings = (suitOrder = ['C', 'H', 'S', 'D']) => (
  Array.from({ length: 52 }, (_, i) => `${EIGHT_KINGS_RANKS[i % 13]}${suitOrder[i % 4]}`)
);

const getDefaultStackState = () => ({
  selectedDeck: 'mnemonica',
  viewRange: 'all',
  hideCards: false,
  customInput: '',
  eightKingsSuitOrder: 'C,H,S,D',
  stats: {
    totalQuestions: 0,
    correctQuestions: 0,
    currentStreak: 0,
    bestStreak: 0,
  },
});

const getDeckCards = (stackState) => {
  if (stackState.selectedDeck === 'mnemonica') return MNEMONICA_STACK;
  if (stackState.selectedDeck === 'custom') return parseCards(stackState.customInput).slice(0, 52);
  const suitOrder = String(stackState.eightKingsSuitOrder || 'C,H,S,D')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => CARD_SUITS.includes(s));
  const safeSuitOrder = suitOrder.length === 4 ? suitOrder : ['C', 'H', 'S', 'D'];
  return generateEightKings(safeSuitOrder);
};

const rangeToIndexes = (range) => {
  if (range === '1-13') return [0, 13];
  if (range === '14-26') return [13, 26];
  if (range === '27-39') return [26, 39];
  if (range === '40-52') return [39, 52];
  return [0, 52];
};

const getRandomInt = (max) => Math.floor(Math.random() * max);

const buildQuestion = (cards, mode = 'mixed') => {
  if (!cards.length) return null;
  const index = getRandomInt(cards.length);
  const type = mode === 'mixed' ? (Math.random() > 0.5 ? 'positionToCard' : 'cardToPosition') : mode;
  return { type, index, card: cards[index], answer: type === 'positionToCard' ? cards[index] : String(index + 1) };
};

const StackTrainer = ({ theme, inputStyle }) => {
  const SectionTitle = ({ icon: Icon, title, subtitle }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.gold, fontWeight: 800, letterSpacing: '0.04em' }}>
        <Icon size={18} />
        {title}
      </div>
      {subtitle && <p style={{ margin: '6px 0 0', color: theme.sub, fontSize: 13, lineHeight: 1.55 }}>{subtitle}</p>}
    </div>
  );
  const [stackState, setStackState] = useState(getDefaultStackState());
  const [flippedCards, setFlippedCards] = useState({});
  const [quizMode, setQuizMode] = useState('positionToCard');
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [testQuestions, setTestQuestions] = useState([]);
  const [testIndex, setTestIndex] = useState(0);
  const [testAnswer, setTestAnswer] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [reviewQuestions, setReviewQuestions] = useState([]);

  useEffect(() => {
    setStackState(loadJson(STACK_TRAINER_KEY, getDefaultStackState()));
  }, []);

  const persistStack = (nextState) => {
    setStackState(nextState);
    saveJson(STACK_TRAINER_KEY, nextState);
  };

  const cards = getDeckCards(stackState);
  const stats = stackState.stats || getDefaultStackState().stats;
  const accuracy = stats.totalQuestions ? Math.round((stats.correctQuestions / stats.totalQuestions) * 100) : 0;
  const [rangeStart, rangeEnd] = rangeToIndexes(stackState.viewRange);
  const visibleCards = cards.slice(rangeStart, Math.min(rangeEnd, cards.length));
  const currentTestQuestion = testQuestions[testIndex];

  const updateStats = (correct) => {
    const current = stackState.stats || getDefaultStackState().stats;
    const nextStreak = correct ? current.currentStreak + 1 : 0;
    const nextStats = {
      totalQuestions: current.totalQuestions + 1,
      correctQuestions: current.correctQuestions + (correct ? 1 : 0),
      currentStreak: nextStreak,
      bestStreak: Math.max(current.bestStreak || 0, nextStreak),
    };
    persistStack({ ...stackState, stats: nextStats });
  };

  const startQuiz = (mode) => {
    const question = buildQuestion(cards, mode);
    setQuizMode(mode);
    setQuizQuestion(question);
    setQuizAnswer('');
    setQuizFeedback(null);
  };

  const checkQuiz = () => {
    if (!quizQuestion) return;
    const normalizedAnswer = quizQuestion.type === 'positionToCard'
      ? normalizeCardInput(quizAnswer)
      : String(Number(quizAnswer.trim()));
    const normalizedCorrect = quizQuestion.type === 'positionToCard'
      ? normalizeCardInput(quizQuestion.answer)
      : String(Number(quizQuestion.answer));
    const correct = normalizedAnswer === normalizedCorrect;
    updateStats(correct);
    setQuizFeedback({ correct, question: quizQuestion, userAnswer: quizAnswer });
  };

  const startTest = (sourceQuestions = null) => {
    const questions = sourceQuestions || Array.from({ length: 10 }, () => buildQuestion(cards, 'mixed')).filter(Boolean);
    setTestQuestions(questions);
    setTestIndex(0);
    setTestAnswer('');
    setTestResults(null);
    setReviewQuestions([]);
  };

  const answerTest = () => {
    if (!currentTestQuestion) return;
    const normalizedAnswer = currentTestQuestion.type === 'positionToCard'
      ? normalizeCardInput(testAnswer)
      : String(Number(testAnswer.trim()));
    const normalizedCorrect = currentTestQuestion.type === 'positionToCard'
      ? normalizeCardInput(currentTestQuestion.answer)
      : String(Number(currentTestQuestion.answer));
    const correct = normalizedAnswer === normalizedCorrect;
    updateStats(correct);
    const answered = { ...currentTestQuestion, correct, userAnswer: testAnswer };
    const nextQuestions = testQuestions.map((q, i) => i === testIndex ? answered : q);
    setTestQuestions(nextQuestions);

    if (testIndex + 1 >= testQuestions.length) {
      const wrong = nextQuestions.filter((q) => !q.correct);
      setReviewQuestions(wrong);
      setTestResults({ correctCount: nextQuestions.filter((q) => q.correct).length, total: nextQuestions.length, wrong });
      setTestAnswer('');
      return;
    }
    setTestIndex(testIndex + 1);
    setTestAnswer('');
  };

  const deckButtonStyle = (deck) => ({
    border: `1px solid ${stackState.selectedDeck === deck ? theme.gold : theme.border}`,
    background: stackState.selectedDeck === deck ? theme.softCard : theme.inputBg,
    color: stackState.selectedDeck === deck ? theme.gold : theme.text,
    borderRadius: 14,
    padding: '11px 10px',
    fontWeight: 900,
    cursor: 'pointer',
  });

  const smallButtonStyle = (active = false) => ({
    border: `1px solid ${active ? theme.gold : theme.border}`,
    background: active ? theme.softCard : theme.inputBg,
    color: active ? theme.gold : theme.text,
    borderRadius: 999,
    padding: '8px 10px',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  });

  return (
    <div>
      <SectionTitle icon={Sparkles} title="Stack Trainer" subtitle="덱 순서를 외우는 마술사를 위한 기억 훈련 공간입니다. 보고, 맞히고, 반대로 맞히고, 섞어서 테스트하세요." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div style={{ background: theme.softCard, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 12 }}>
          <div style={{ color: theme.sub, fontSize: 11 }}>연속 정답</div>
          <div style={{ color: theme.gold, fontWeight: 900, fontSize: 22, marginTop: 4 }}>{stats.currentStreak || 0}</div>
        </div>
        <div style={{ background: theme.softCard, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 12 }}>
          <div style={{ color: theme.sub, fontSize: 11 }}>정답률</div>
          <div style={{ color: theme.gold, fontWeight: 900, fontSize: 22, marginTop: 4 }}>{accuracy}%</div>
        </div>
      </div>

      <SectionTitle icon={BookOpen} title="덱 선택" subtitle="네모니카는 제공한 고정 순서 프리셋, 8 Kings는 자동 생성, 커스텀은 직접 입력입니다." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        <button onClick={() => { persistStack({ ...stackState, selectedDeck: 'mnemonica' }); setFlippedCards({}); }} style={deckButtonStyle('mnemonica')}>네모니카</button>
        <button onClick={() => { persistStack({ ...stackState, selectedDeck: 'eightKings' }); setFlippedCards({}); }} style={deckButtonStyle('eightKings')}>8 Kings</button>
        <button onClick={() => { persistStack({ ...stackState, selectedDeck: 'custom' }); setFlippedCards({}); }} style={deckButtonStyle('custom')}>커스텀</button>
      </div>

      {stackState.selectedDeck === 'eightKings' && (
        <div style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 12, marginBottom: 18 }}>
          <div style={{ color: theme.gold, fontWeight: 900, marginBottom: 4 }}>8 Kings 자동 생성</div>
          <div style={{ color: theme.sub, fontSize: 12, lineHeight: 1.55 }}>숫자 순서 8-K-3-10-2-7-9-5-Q-4-A-6-J와 CHaSeD 무늬 순서(C-H-S-D)를 기준으로 52장을 자동 생성합니다.</div>
        </div>
      )}

      {stackState.selectedDeck === 'custom' && (
        <div style={{ marginBottom: 18 }}>
          <textarea value={stackState.customInput || ''} onChange={(e) => persistStack({ ...stackState, customInput: e.target.value })} placeholder="예: 4C, 2H, 7D ... / 쉼표 또는 줄바꿈으로 52장을 입력" rows={5} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
          <div style={{ color: theme.sub, fontSize: 12, marginTop: 6 }}>현재 입력: {cards.length} / 52장</div>
        </div>
      )}

      <SectionTitle icon={BookOpen} title="전체 순서 보기" subtitle="카드를 누르면 낱말카드처럼 뒤집히며 해당 번호가 나옵니다." />
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
        {['all', '1-13', '14-26', '27-39', '40-52'].map((range) => (
          <button key={range} onClick={() => { persistStack({ ...stackState, viewRange: range }); setFlippedCards({}); }} style={smallButtonStyle(stackState.viewRange === range)}>{range === 'all' ? '전체보기' : range}</button>
        ))}
        <button onClick={() => { persistStack({ ...stackState, hideCards: !stackState.hideCards }); setFlippedCards({}); }} style={smallButtonStyle(stackState.hideCards)}>{stackState.hideCards ? '카드 보이기' : '카드 가림'}</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        {visibleCards.map((card, idx) => {
          const absoluteIndex = rangeStart + idx;
          const flipped = !!flippedCards[absoluteIndex];
          const showBack = flipped;
          return (
            <button key={`${absoluteIndex}-${card}`} onClick={() => setFlippedCards({ ...flippedCards, [absoluteIndex]: !flipped })} style={{ minHeight: 72, border: `1px solid ${theme.border}`, borderRadius: 14, background: showBack ? theme.softCard : theme.inputBg, color: showBack ? theme.gold : cardColor(card, theme), cursor: 'pointer', fontWeight: 900, boxShadow: showBack ? '0 0 14px rgba(212, 175, 55, 0.12)' : 'none' }}>
              <div style={{ fontSize: 21 }}>{showBack ? absoluteIndex + 1 : (stackState.hideCards ? '?' : formatCard(card))}</div>
              <div style={{ color: theme.sub, fontSize: 10, marginTop: 4 }}>{showBack ? formatCard(card) : 'tap'}</div>
            </button>
          );
        })}
      </div>

      <SectionTitle icon={Wand2} title="위치 → 카드 퀴즈" subtitle="번호를 보고 해당 카드를 맞힙니다." />
      <div style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, marginBottom: 18 }}>
        <button onClick={() => startQuiz('positionToCard')} style={{ ...smallButtonStyle(true), marginBottom: 10 }}>새 문제</button>
        {quizQuestion?.type === 'positionToCard' && (
          <div>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Q. {quizQuestion.index + 1}번째 카드는?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <input value={quizAnswer} onChange={(e) => setQuizAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') checkQuiz(); }} placeholder="예: 4C 또는 4♣" style={inputStyle} />
              <button onClick={checkQuiz} style={smallButtonStyle(true)}>확인</button>
            </div>
            {quizFeedback && <div style={{ marginTop: 10, color: quizFeedback.correct ? theme.gold : '#ff6b6b', fontWeight: 900 }}>{quizFeedback.correct ? '정답입니다.' : `오답입니다. 정답은 ${formatCard(quizQuestion.card)}입니다.`}</div>}
          </div>
        )}
      </div>

      <SectionTitle icon={Wand2} title="카드 → 위치 퀴즈" subtitle="카드를 보고 몇 번째인지 맞힙니다." />
      <div style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14, marginBottom: 18 }}>
        <button onClick={() => startQuiz('cardToPosition')} style={{ ...smallButtonStyle(true), marginBottom: 10 }}>새 문제</button>
        {quizQuestion?.type === 'cardToPosition' && (
          <div>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Q. <span style={{ color: cardColor(quizQuestion.card, theme), fontSize: 20 }}>{formatCard(quizQuestion.card)}</span> 는 몇 번째 카드일까요?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <input value={quizAnswer} onChange={(e) => setQuizAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') checkQuiz(); }} placeholder="예: 17" type="number" style={inputStyle} />
              <button onClick={checkQuiz} style={smallButtonStyle(true)}>확인</button>
            </div>
            {quizFeedback && <div style={{ marginTop: 10, color: quizFeedback.correct ? theme.gold : '#ff6b6b', fontWeight: 900 }}>{quizFeedback.correct ? '정답입니다.' : `오답입니다. 정답은 ${quizQuestion.index + 1}번입니다.`}</div>}
          </div>
        )}
      </div>

      <SectionTitle icon={Trophy} title="랜덤 10문제 테스트" subtitle="두 방향 문제를 섞어서 풀고, 끝난 뒤 틀린 문제를 다시 풀 수 있습니다." />
      <div style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button onClick={() => startTest()} style={smallButtonStyle(true)}>10문제 시작</button>
          {reviewQuestions.length > 0 && <button onClick={() => startTest(reviewQuestions.map(({ correct, userAnswer, ...q }) => q))} style={smallButtonStyle(false)}>틀린 문제 다시 풀기</button>}
        </div>
        {currentTestQuestion && !testResults && (
          <div>
            <div style={{ color: theme.sub, fontSize: 12, marginBottom: 6 }}>{testIndex + 1} / {testQuestions.length}</div>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>
              {currentTestQuestion.type === 'positionToCard'
                ? `Q. ${currentTestQuestion.index + 1}번째 카드는?`
                : <>Q. <span style={{ color: cardColor(currentTestQuestion.card, theme), fontSize: 20 }}>{formatCard(currentTestQuestion.card)}</span> 는 몇 번째?</>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <input value={testAnswer} onChange={(e) => setTestAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') answerTest(); }} placeholder={currentTestQuestion.type === 'positionToCard' ? '예: 4C' : '예: 17'} style={inputStyle} />
              <button onClick={answerTest} style={smallButtonStyle(true)}>다음</button>
            </div>
          </div>
        )}
        {testResults && (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ color: theme.gold, fontWeight: 900, fontSize: 18 }}>테스트 완료</div>
            <div>정답: <strong>{testResults.correctCount} / {testResults.total}</strong></div>
            <div>정답률: <strong>{Math.round((testResults.correctCount / testResults.total) * 100)}%</strong></div>
            {testResults.wrong.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ color: theme.sub, fontSize: 12, marginBottom: 5 }}>틀린 문제</div>
                {testResults.wrong.map((q, i) => <div key={i} style={{ color: '#ff9b9b', fontSize: 13 }}>{q.type === 'positionToCard' ? `${q.index + 1}번 → ${formatCard(q.card)}` : `${formatCard(q.card)} → ${q.index + 1}번`}</div>)}
              </div>
            )}
          </div>
        )}
        {cards.length < 52 && stackState.selectedDeck === 'custom' && <p style={{ color: '#ff9b9b', fontSize: 12, lineHeight: 1.5 }}>커스텀 덱은 52장을 입력해야 전체 퀴즈가 정확히 작동합니다.</p>}
      </div>

    </div>
  );
};

export default function StackTrainerPage() {
  const [settings, setSettings] = useState({ theme: 'dark', sound: true });

  useEffect(() => {
    setSettings(loadJson(SETTINGS_KEY, { theme: 'dark', sound: true }));
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

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: theme.bg, minHeight: '100vh', color: theme.text, padding: '24px 18px 48px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        button, input, textarea, select { font-family: inherit; }
        @media (max-width: 720px) {
          .stack-shell { padding: 20px 14px !important; border-radius: 22px !important; }
        }
      `}</style>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: theme.dark ? 0.28 : 0.18 }}>
        {[...Array(42)].map((_, i) => (
          <div key={i} style={{ position: 'absolute', top: `${(i * 37) % 100}%`, left: `${(i * 53) % 100}%`, width: `${(i % 3) + 1}px`, height: `${(i % 3) + 1}px`, background: theme.gold, borderRadius: '50%', opacity: 0.55 }} />
        ))}
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <button
          onClick={() => { window.location.href = '/'; }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: `1px solid ${theme.border}`,
            background: theme.inputBg,
            color: theme.text,
            borderRadius: 999,
            padding: '10px 14px',
            cursor: 'pointer',
            fontWeight: 800,
            marginBottom: 18,
          }}
        >
          <Home size={16} /> 메인으로
        </button>

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, color: theme.gold, marginBottom: 8 }}>
            <Sparkles size={20} />
            <span style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.16em', fontWeight: 800 }}>STACK TRAINER</span>
            <Sparkles size={20} />
          </div>
          <h1 style={{ margin: 0, fontFamily: "'Cinzel', serif", fontSize: 'clamp(30px, 6vw, 52px)', lineHeight: 1.08 }}>Stack Trainer</h1>
          <p style={{ margin: '12px auto 0', maxWidth: 620, color: theme.sub, lineHeight: 1.65, fontSize: 14 }}>
            네모니카, 8 Kings, 커스텀 스택을 넓은 화면에서 낱말카드·전체 순서·랜덤 테스트로 연습합니다.
          </p>
        </div>

        <main className="stack-shell" style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 28, padding: 28, boxShadow: theme.shadow }}>
          <StackTrainer theme={theme} inputStyle={inputStyle} />
        </main>
      </div>
    </div>
  );
}
