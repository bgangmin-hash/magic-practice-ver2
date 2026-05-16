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

const PixelMagician = ({ active }) => {
  const C = {
    H: '#3a1f5e',
    G: '#d4af37',
    S: '#f0d4a8',
    E: '#0a0510',
    R: '#5a2a8a',
    D: '#3a1a5a',
    M: '#2a1530',
    W: '#7a4a20',
  };
  const art = [
    '.....HH.......',
    '....HHHH......',
    '...HHHGHH.....',
    '..HHHHHHHH....',
    '.HHHHHHHHHH...',
    'GGGGGGGGGGGG..',
    '...SSSSSS.....',
    '..SEESSEES....',
    '..SSSSSSSS....',
    '...SMMMS......',
    '..RRRRRRR.....',
    '.RRRRRRRRR....',
    '.DRRRRRRRRWWWG',
    '..DD..DD......',
  ];
  const P = 7;
  const W = 14;
  const H = 14;
  return (
    <div style={{ display: 'inline-block', animation: active ? 'none' : 'idleBob 1.8s ease-in-out infinite' }}>
      <svg width={W * P} height={H * P} viewBox={`0 0 ${W * P} ${H * P}`} style={{ imageRendering: 'pixelated', display: 'block', shapeRendering: 'crispEdges' }}>
        {art.map((row, y) => row.split('').map((ch, x) => ch === '.' ? null : (
          <rect key={`${x}-${y}`} x={x * P} y={y * P} width={P} height={P} fill={C[ch] || '#fff'} />
        )))}
      </svg>
    </div>
  );
};

export default function MagicPracticeTracker() {
  const [secondsLeft, setSecondsLeft] = useState(PRACTICE_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [practiceData, setPracticeData] = useState({});
  const [notes, setNotes] = useState({});
  const [routines, setRoutines] = useState({});
  const [settings, setSettings] = useState({ theme: 'dark', sound: true });
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('Practice');
  const [justCompleted, setJustCompleted] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);
  const [newRoutine, setNewRoutine] = useState({ category: '카드마술', title: '', targetSets: 1 });
  const fileInputRef = useRef(null);
  const intervalRef = useRef(null);

  const todayKey = getDateKey();

  useEffect(() => {
    setPracticeData(loadJson(STORAGE_KEY, {}));
    setNotes(loadJson(NOTES_KEY, {}));
    setRoutines(loadJson(ROUTINES_KEY, {}));
    setSettings(loadJson(SETTINGS_KEY, { theme: 'dark', sound: true }));
  }, []);

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      intervalRef.current = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      handleComplete();
    }
  }, [secondsLeft, isRunning]);

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

  const todaySets = practiceData[todayKey] || 0;
  const totalSets = Object.values(practiceData).reduce((s, n) => s + Number(n || 0), 0);
  const totalMinutes = totalSets * 3;
  const practiceDays = Object.values(practiceData).filter((sets) => sets > 0).length;
  const averageSets = practiceDays ? (totalSets / practiceDays).toFixed(1) : '0.0';
  const streak = getStreak(practiceData);
  const bestRecord = getBestRecord(practiceData);
  const levelInfo = getLevelInfo(totalSets);
  const todayNote = notes[todayKey] || '';
  const todayRoutines = routines[todayKey] || [];
  const achievements = getAchievements({ totalSets, streak, todaySets, notesCount: Object.values(notes).filter(Boolean).length, routines });

  const progress = ((PRACTICE_SECONDS - secondsLeft) / PRACTICE_SECONDS) * 100;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeDisplay = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const last10Days = getLast10Days();
  const chartData = last10Days.map((d) => ({ label: d.label, sets: practiceData[d.key] || 0, isToday: d.isToday }));
  const maxSets = Math.max(...chartData.map((d) => d.sets), 1);
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const persistSettings = (nextSettings) => {
    setSettings(nextSettings);
    saveJson(SETTINGS_KEY, nextSettings);
  };

  const handleComplete = () => {
    const newData = { ...practiceData, [todayKey]: (practiceData[todayKey] || 0) + 1 };
    const prevTotalSets = Object.values(practiceData).reduce((s, n) => s + Number(n || 0), 0);
    const newTotalSets = prevTotalSets + 1;
    const prevLv = getLevelInfo(prevTotalSets).level;
    const newLvInfo = getLevelInfo(newTotalSets);

    setPracticeData(newData);
    saveJson(STORAGE_KEY, newData);
    setJustCompleted(true);
    playTone('complete', settings.sound);

    if (newLvInfo.level > prevLv) {
      setTimeout(() => {
        setLevelUpData(newLvInfo);
        playTone('level', settings.sound);
        setTimeout(() => setLevelUpData(null), 3000);
      }, 900);
    }

    setTimeout(() => {
      setSecondsLeft(PRACTICE_SECONDS);
      setJustCompleted(false);
    }, 2200);
  };

  const handleStartPause = () => {
    if (!isRunning) playTone('start', settings.sound);
    if (secondsLeft === 0) setSecondsLeft(PRACTICE_SECONDS);
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(PRACTICE_SECONDS);
  };

  const handleNoteChange = (value) => {
    const nextNotes = { ...notes, [todayKey]: value };
    setNotes(nextNotes);
    saveJson(NOTES_KEY, nextNotes);
  };

  const addRoutine = () => {
    const title = newRoutine.title.trim();
    if (!title) return;
    const next = {
      ...routines,
      [todayKey]: [
        ...(routines[todayKey] || []),
        {
          id: `${Date.now()}`,
          category: newRoutine.category,
          title,
          targetSets: Number(newRoutine.targetSets) || 1,
          done: false,
        },
      ],
    };
    setRoutines(next);
    saveJson(ROUTINES_KEY, next);
    setNewRoutine({ category: '카드마술', title: '', targetSets: 1 });
  };

  const toggleRoutine = (id) => {
    const next = {
      ...routines,
      [todayKey]: todayRoutines.map((routine) => routine.id === id ? { ...routine, done: !routine.done } : routine),
    };
    setRoutines(next);
    saveJson(ROUTINES_KEY, next);
  };

  const deleteRoutine = (id) => {
    const next = {
      ...routines,
      [todayKey]: todayRoutines.filter((routine) => routine.id !== id),
    };
    setRoutines(next);
    saveJson(ROUTINES_KEY, next);
  };

  const exportBackup = () => {
    const payload = {
      app: 'Magic Practice',
      exportedAt: new Date().toISOString(),
      practiceData,
      notes,
      routines,
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `magic-practice-backup-${todayKey}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const nextPractice = parsed.practiceData || {};
        const nextNotes = parsed.notes || {};
        const nextRoutines = parsed.routines || {};
        const nextSettings = parsed.settings || { theme: 'dark', sound: true };
        setPracticeData(nextPractice);
        setNotes(nextNotes);
        setRoutines(nextRoutines);
        setSettings(nextSettings);
        saveJson(STORAGE_KEY, nextPractice);
        saveJson(NOTES_KEY, nextNotes);
        saveJson(ROUTINES_KEY, nextRoutines);
        saveJson(SETTINGS_KEY, nextSettings);
      } catch {
        alert('백업 파일을 읽을 수 없습니다.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const MenuButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveMenu(id)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 14,
        border: activeMenu === id ? `1px solid ${theme.border}` : '1px solid transparent',
        background: activeMenu === id ? theme.softCard : 'transparent',
        color: activeMenu === id ? theme.gold : theme.text,
        cursor: 'pointer',
        fontWeight: 700,
      }}
    >
      <Icon size={17} />
      {label}
    </button>
  );

  const SectionTitle = ({ icon: Icon, title, subtitle }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: theme.gold, fontWeight: 800, letterSpacing: '0.04em' }}>
        <Icon size={18} />
        {title}
      </div>
      {subtitle && <p style={{ margin: '6px 0 0', color: theme.sub, fontSize: 13, lineHeight: 1.55 }}>{subtitle}</p>}
    </div>
  );

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
    <div style={{ fontFamily: "'Manrope', sans-serif", background: theme.bg, minHeight: '100vh', color: theme.text, padding: '28px 20px 32px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(1); } 50% { opacity: 0.9; transform: scale(1.4); } }
        @keyframes rewardPop { 0% { opacity: 0; transform: scale(0.5); } 20% { opacity: 1; transform: scale(1.2); } 40% { transform: scale(1); } 100% { opacity: 0; transform: scale(1.5) translateY(-40px); } }
        @keyframes pulse-gold { 0%, 100% { filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.4)); } 50% { filter: drop-shadow(0 0 24px rgba(212, 175, 55, 0.9)); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes levelUpBurst { 0% { opacity: 0; transform: scale(0.4); } 30% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(2); } }
        @keyframes levelUpFade { 0% { opacity: 0; transform: translateY(20px); } 15% { opacity: 1; transform: translateY(0); } 85% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-20px); } }
        @keyframes levelUpNumber { 0% { opacity: 0; transform: scale(0.3) rotate(-8deg); } 20% { opacity: 1; transform: scale(1.25) rotate(0deg); } 35% { transform: scale(1); } 85% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.3); } }
        @keyframes idleBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes magicShootA { 0% { transform: translate(0, 0) scale(1); opacity: 0; } 12% { opacity: 1; } 50% { transform: translate(140px, -12px) scale(0.75); opacity: 1; } 100% { transform: translate(290px, -3px) scale(0.2); opacity: 0; } }
        @keyframes magicShootB { 0% { transform: translate(0, 0) scale(1); opacity: 0; } 12% { opacity: 1; } 50% { transform: translate(140px, 10px) scale(0.75); opacity: 1; } 100% { transform: translate(290px, 3px) scale(0.2); opacity: 0; } }
        @keyframes wandGlow { 0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; } 50% { transform: translate(-50%, -50%) scale(1.8); opacity: 1; } }
        .timer-ring-active { animation: pulse-gold 2s ease-in-out infinite; }
        .star-filled { animation: fadeUp 0.5s ease-out backwards; }
        button, input, textarea, select { font-family: inherit; }
      `}</style>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: theme.dark ? 0.4 : 0.28 }}>
        {[...Array(40)].map((_, i) => (
          <div key={i} style={{ position: 'absolute', top: `${(i * 37) % 100}%`, left: `${(i * 53) % 100}%`, width: `${(i % 3) + 1}px`, height: `${(i % 3) + 1}px`, background: theme.gold, borderRadius: '50%', animation: 'twinkle 3s ease-in-out infinite', animationDelay: `${(i % 7) * 0.3}s`, opacity: 0.6 }} />
        ))}
      </div>

      {justCompleted && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 56, fontWeight: 700, color: theme.gold, textShadow: '0 0 40px rgba(212, 175, 55, 0.8), 0 0 80px rgba(212, 175, 55, 0.4)', animation: 'rewardPop 2.2s ease-out', letterSpacing: '0.05em' }}>+1 SET</div>
        </div>
      )}

      {levelUpData && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
          <div style={{ position: 'absolute', width: 600, height: 600, maxWidth: '100vw', maxHeight: '100vh', background: 'radial-gradient(circle, rgba(212, 175, 55, 0.35) 0%, rgba(212, 175, 55, 0.08) 40%, transparent 65%)', animation: 'levelUpBurst 3s ease-out' }} />
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, letterSpacing: '0.5em', color: theme.gold, animation: 'levelUpFade 3s ease-out', zIndex: 1, textTransform: 'uppercase' }}>Level Up</div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 72, fontWeight: 700, color: '#f4d97a', textShadow: '0 0 40px rgba(212, 175, 55, 1), 0 0 80px rgba(212, 175, 55, 0.6)', animation: 'levelUpNumber 3s ease-out', zIndex: 1, lineHeight: 1 }}>Lv {levelUpData.level}</div>
          <div style={{ fontSize: 18, letterSpacing: '0.2em', color: '#f4e4c1', animation: 'levelUpFade 3s ease-out', animationDelay: '0.2s', zIndex: 1, fontWeight: 500 }}>{levelUpData.rank}</div>
        </div>
      )}

      <div style={{ maxWidth: 540, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="메뉴 열기"
          style={{ position: 'fixed', right: 18, top: 18, zIndex: 30, width: 46, height: 46, borderRadius: 999, border: `1px solid ${theme.border}`, background: theme.card, color: theme.text, boxShadow: theme.shadow, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Menu size={21} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
            <Wand2 size={20} style={{ color: theme.gold }} />
            <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 30, fontWeight: 600, letterSpacing: '0.12em', margin: 0, color: theme.text }}>Magic Practice</h1>
            <Wand2 size={20} style={{ color: theme.gold, transform: 'scaleX(-1)' }} />
          </div>
          <p style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.sub, margin: 0 }}>혼자 조용히 연습하고, 기록하고, 성장하는 마술 연습 다이어리 앱</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { icon: Flame, label: 'Streak', value: `${streak}일` },
            { icon: Trophy, label: '칭호', value: levelInfo.rank },
            { icon: BarChart3, label: '총 연습', value: `${totalMinutes}분` },
          ].map((item) => (
            <div key={item.label} style={{ background: theme.softCard, border: `1px solid ${theme.border}`, borderRadius: 16, padding: '13px 10px', textAlign: 'center', minHeight: 68 }}>
              <item.icon size={16} style={{ color: theme.gold, marginBottom: 6 }} />
              <div style={{ color: theme.sub, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ color: theme.text, fontSize: item.label === '칭호' ? 12 : 18, fontWeight: 800, marginTop: 4 }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: theme.softCard, border: `1px solid ${theme.border}`, borderRadius: 16, padding: '16px 20px', marginBottom: 20, backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Crown size={16} style={{ color: theme.gold }} />
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 15, fontWeight: 600, color: theme.gold, letterSpacing: '0.08em' }}>Lv {levelInfo.level}</span>
              <span style={{ fontSize: 13, color: theme.text, letterSpacing: '0.04em' }}>· {levelInfo.rank}</span>
            </div>
            <span style={{ fontSize: 11, color: theme.sub, letterSpacing: '0.05em' }}>{levelInfo.expInLevel} / {levelInfo.expNeeded} EXP</span>
          </div>
          <div style={{ height: 6, background: 'rgba(212, 175, 55, 0.12)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(levelInfo.progress, 100)}%`, background: 'linear-gradient(90deg, #9c7c1f 0%, #d4af37 50%, #f4d97a 100%)', borderRadius: 3, transition: 'width 0.8s ease-out', boxShadow: '0 0 10px rgba(212, 175, 55, 0.6)' }} />
          </div>
        </div>

        <div style={{ position: 'relative', height: 120, marginBottom: 20, background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 14, overflow: 'hidden', display: 'flex', alignItems: 'center', paddingLeft: 20 }}>
          <div style={{ position: 'relative', zIndex: 1 }}><PixelMagician active={isRunning} /></div>
          {isRunning && (
            <>
              <div style={{ position: 'absolute', left: 125, top: '50%', marginTop: 35, width: 8, height: 8, background: '#f4d97a', borderRadius: '50%', boxShadow: '0 0 18px #d4af37, 0 0 32px rgba(212, 175, 55, 0.6)', animation: 'wandGlow 0.7s ease-in-out infinite', zIndex: 1, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', left: 125, top: '50%', marginTop: 35, zIndex: 2, pointerEvents: 'none' }}>
                {[...Array(7)].map((_, i) => <div key={i} style={{ position: 'absolute', width: 5, height: 5, background: i % 3 === 0 ? '#fff5cc' : '#f4d97a', borderRadius: '50%', boxShadow: '0 0 8px #d4af37, 0 0 14px rgba(212, 175, 55, 0.6)', animation: `magicShoot${i % 2 === 0 ? 'A' : 'B'} 1.4s ease-out infinite`, animationDelay: `${i * 0.2}s` }} />)}
              </div>
            </>
          )}
          <div style={{ position: 'absolute', right: 16, bottom: 10, fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: isRunning ? theme.gold : theme.dim }}>{isRunning ? '✦ 시전 중' : '대기'}</div>
        </div>

        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 24, padding: '40px 24px 32px', backdropFilter: 'blur(8px)', marginBottom: 24, boxShadow: theme.shadow }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div style={{ position: 'relative', width: 300, height: 300 }} className={isRunning ? 'timer-ring-active' : ''}>
              <svg width="300" height="300" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="150" cy="150" r={radius} fill="none" stroke="rgba(212, 175, 55, 0.12)" strokeWidth="6" />
                <circle cx="150" cy="150" r={radius} fill="none" stroke="url(#goldGradient)" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: 'stroke-dashoffset 1s linear' }} />
                <defs><linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f4d97a" /><stop offset="50%" stopColor="#d4af37" /><stop offset="100%" stopColor="#9c7c1f" /></linearGradient></defs>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 64, fontWeight: 500, color: theme.text, letterSpacing: '0.02em', lineHeight: 1 }}>{timeDisplay}</div>
                <div style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: theme.sub, marginTop: 12 }}>{isRunning ? '연습 중' : secondsLeft === PRACTICE_SECONDS ? '준비' : '일시정지'}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 32 }}>
            <button onClick={handleStartPause} style={{ background: isRunning ? theme.inputBg : 'linear-gradient(135deg, #d4af37 0%, #9c7c1f 100%)', color: isRunning ? theme.text : '#1a1430', border: isRunning ? `1px solid ${theme.border}` : 'none', borderRadius: 999, padding: '14px 36px', fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: isRunning ? 'none' : '0 8px 24px rgba(212, 175, 55, 0.3)' }}>
              {isRunning ? <Pause size={16} /> : <Play size={16} />}
              {isRunning ? '일시정지' : secondsLeft === PRACTICE_SECONDS ? '시작' : '계속'}
            </button>
            <button onClick={handleReset} style={{ background: 'transparent', color: theme.sub, border: `1px solid ${theme.border}`, borderRadius: 999, padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><RotateCcw size={16} /></button>
          </div>

          <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <span style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: theme.sub }}>오늘의 세트</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 28, fontWeight: 600, color: theme.gold }}>{todaySets}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[...Array(Math.max(todaySets, 5))].map((_, i) => {
                const filled = i < todaySets;
                return <Sparkles key={i} size={24} className={filled ? 'star-filled' : ''} style={{ color: filled ? theme.gold : 'rgba(138, 122, 90, 0.25)', fill: filled ? theme.gold : 'none', filter: filled ? 'drop-shadow(0 0 6px rgba(212, 175, 55, 0.6))' : 'none', animationDelay: `${i * 0.08}s` }} />;
              })}
            </div>
          </div>
        </div>

        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 24, padding: '28px 20px 20px', backdropFilter: 'blur(8px)', boxShadow: theme.shadow }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20, padding: '0 8px' }}>
            <span style={{ fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: theme.sub }}>최근 10일</span>
            <span style={{ fontSize: 12, color: theme.sub }}>총 {chartData.reduce((sum, d) => sum + d.sets, 0)} sets</span>
          </div>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fill: theme.sub, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, Math.max(maxSets + 1, 5)]} />
                <Tooltip cursor={{ fill: 'rgba(212, 175, 55, 0.08)' }} contentStyle={{ background: theme.dark ? '#1a1430' : '#fff8e7', border: `1px solid ${theme.border}`, borderRadius: 8, color: theme.text, fontSize: 12 }} formatter={(value) => [`${value} sets`, '']} labelStyle={{ color: theme.gold }} />
                <Bar dataKey="sets" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => <Cell key={index} fill={entry.isToday ? '#d4af37' : 'rgba(212, 175, 55, 0.35)'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: theme.dim, letterSpacing: '0.2em' }}>3 MIN · 1 SET = 10 EXP · LEVEL UP</div>
      </div>

      {menuOpen && <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', zIndex: 35 }} />}
      <aside style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 'min(430px, 92vw)', background: theme.dark ? 'rgba(12, 9, 24, 0.98)' : 'rgba(255, 248, 231, 0.98)', color: theme.text, zIndex: 40, transform: menuOpen ? 'translateX(0)' : 'translateX(105%)', transition: 'transform 0.25s ease', borderLeft: `1px solid ${theme.border}`, boxShadow: '-20px 0 60px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 20, borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", color: theme.gold, letterSpacing: '0.12em', fontWeight: 700 }}>MENU</div>
            <div style={{ fontSize: 12, color: theme.sub, marginTop: 4 }}>연습 · 기록 · 성장</div>
          </div>
          <button onClick={() => setMenuOpen(false)} aria-label="메뉴 닫기" style={{ width: 38, height: 38, borderRadius: 999, border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text, cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '138px 1fr', minHeight: 0, flex: 1 }}>
          <nav style={{ padding: 14, borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <MenuButton id="Practice" icon={BarChart3} label="Practice" />
            <MenuButton id="Magic Notes" icon={BookOpen} label="Magic Notes" />
            <MenuButton id="Links" icon={LinkIcon} label="Links" />
            <MenuButton id="Settings" icon={Settings} label="Settings" />
          </nav>

          <div style={{ padding: 18, overflowY: 'auto' }}>
            {activeMenu === 'Practice' && (
              <div>
                <SectionTitle icon={BarChart3} title="Practice" subtitle="연습기록과 통계를 한 번에 봅니다." />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                  {[
                    ['총 연습 시간', `${totalMinutes}분`],
                    ['평균 세트', `${averageSets} sets`],
                    ['최고 기록', `${bestRecord.sets} sets`],
                    ['최고 기록일', bestRecord.date === '-' ? '-' : bestRecord.date],
                  ].map(([label, value]) => (
                    <div key={label} style={{ background: theme.softCard, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 12 }}>
                      <div style={{ color: theme.sub, fontSize: 11 }}>{label}</div>
                      <div style={{ color: theme.text, fontWeight: 800, marginTop: 5 }}>{value}</div>
                    </div>
                  ))}
                </div>

                <SectionTitle icon={CheckCircle2} title="오늘의 루틴" subtitle="카테고리별로 오늘 연습할 마술을 정리합니다." />
                <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
                  <select value={newRoutine.category} onChange={(e) => setNewRoutine({ ...newRoutine, category: e.target.value })} style={inputStyle}>
                    {PRACTICE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                  </select>
                  <input value={newRoutine.title} onChange={(e) => setNewRoutine({ ...newRoutine, title: e.target.value })} placeholder="예: 더블 리프트, 코인 롤, 대사 연습" style={inputStyle} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                    <input type="number" min="1" value={newRoutine.targetSets} onChange={(e) => setNewRoutine({ ...newRoutine, targetSets: e.target.value })} style={inputStyle} />
                    <button onClick={addRoutine} style={{ border: 'none', borderRadius: 12, padding: '0 14px', background: 'linear-gradient(135deg, #d4af37 0%, #9c7c1f 100%)', color: '#1a1430', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={15} />추가</button>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  {todayRoutines.length === 0 ? (
                    <p style={{ color: theme.sub, fontSize: 13, lineHeight: 1.6 }}>아직 오늘의 루틴이 없습니다. 오늘 연습할 마술을 하나만 적어도 충분합니다.</p>
                  ) : todayRoutines.map((routine) => (
                    <div key={routine.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 9, alignItems: 'center', background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 10 }}>
                      <button onClick={() => toggleRoutine(routine.id)} style={{ background: 'transparent', border: 'none', color: routine.done ? theme.gold : theme.sub, cursor: 'pointer' }}><CheckCircle2 size={19} /></button>
                      <div>
                        <div style={{ fontSize: 12, color: theme.gold, fontWeight: 800 }}>{routine.category} · {routine.targetSets}세트</div>
                        <div style={{ textDecoration: routine.done ? 'line-through' : 'none', opacity: routine.done ? 0.6 : 1 }}>{routine.title}</div>
                      </div>
                      <button onClick={() => deleteRoutine(routine.id)} style={{ background: 'transparent', border: 'none', color: theme.sub, cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>

                <SectionTitle icon={Trophy} title="칭호 시스템" subtitle="연습 기록에 따라 업적이 열립니다." />
                <div style={{ display: 'grid', gap: 8 }}>
                  {achievements.map((ach) => (
                    <div key={ach.title} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: 11, borderRadius: 14, background: ach.unlocked ? theme.softCard : theme.inputBg, border: `1px solid ${theme.border}`, opacity: ach.unlocked ? 1 : 0.58 }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{ach.unlocked ? '🏅 ' : '🔒 '}{ach.title}</div>
                        <div style={{ color: theme.sub, fontSize: 12, marginTop: 3 }}>{ach.description}</div>
                      </div>
                      <div style={{ color: ach.unlocked ? theme.gold : theme.sub, fontSize: 12, fontWeight: 800 }}>{ach.unlocked ? '완료' : '대기'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeMenu === 'Magic Notes' && (
              <div>
                <SectionTitle icon={BookOpen} title="Magic Notes" subtitle="오늘의 깨달음을 짧게 남깁니다." />
                <textarea value={todayNote} onChange={(e) => handleNoteChange(e.target.value)} placeholder="예: 패스를 할 때 손보다 시선이 먼저 자연스러워야 한다." rows={8} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
                <div style={{ marginTop: 18 }}>
                  <SectionTitle icon={Sparkles} title="최근 노트" subtitle="날짜별로 저장된 깨달음입니다." />
                  <div style={{ display: 'grid', gap: 8 }}>
                    {Object.entries(notes).filter(([, text]) => text.trim()).sort(([a], [b]) => b.localeCompare(a)).slice(0, 8).map(([date, text]) => (
                      <div key={date} style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 12 }}>
                        <div style={{ color: theme.gold, fontSize: 12, fontWeight: 800, marginBottom: 5 }}>{date}</div>
                        <div style={{ color: theme.text, fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{text}</div>
                      </div>
                    ))}
                    {Object.values(notes).filter((text) => text.trim()).length === 0 && <p style={{ color: theme.sub, fontSize: 13 }}>아직 저장된 깨달음이 없습니다.</p>}
                  </div>
                </div>
              </div>
            )}

            {activeMenu === 'Links' && (
              <div>
                <SectionTitle icon={LinkIcon} title="Links" subtitle="추천 마술 채널, 추천 마술샵, 추천 자료를 모아둡니다." />
                <div style={{ display: 'grid', gap: 10 }}>
                  {RESOURCE_LINKS.map((link) => (
                    <div key={link.title} style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14 }}>
                      <div style={{ color: theme.gold, fontWeight: 900, marginBottom: 5 }}>{link.title}</div>
                      <p style={{ color: theme.sub, fontSize: 13, lineHeight: 1.55, margin: '0 0 10px' }}>{link.description}</p>
                      {link.url ? <a href={link.url} target="_blank" rel="noreferrer" style={{ color: theme.text, fontWeight: 800 }}>{link.label}</a> : <div style={{ color: theme.dim, fontSize: 12 }}>코드 상단 RESOURCE_LINKS에 실제 URL을 넣으면 버튼처럼 사용할 수 있습니다.</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeMenu === 'Settings' && (
              <div>
                <SectionTitle icon={Settings} title="Settings" subtitle="화면, 사운드, 백업, 홈화면 설치 안내를 관리합니다." />
                <div style={{ display: 'grid', gap: 10 }}>
                  <button onClick={() => persistSettings({ ...settings, theme: settings.theme === 'light' ? 'dark' : 'light' })} style={{ ...inputStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{settings.theme === 'light' ? <Sun size={16} /> : <Moon size={16} />} 다크/라이트 모드</span>
                    <strong>{settings.theme === 'light' ? 'Light' : 'Dark'}</strong>
                  </button>
                  <button onClick={() => persistSettings({ ...settings, sound: !settings.sound })} style={{ ...inputStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{settings.sound ? <Volume2 size={16} /> : <VolumeX size={16} />} 사운드 효과</span>
                    <strong>{settings.sound ? 'ON' : 'OFF'}</strong>
                  </button>
                  <button onClick={exportBackup} style={{ ...inputStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Download size={16} /> 데이터 백업하기</span>
                    <strong>JSON</strong>
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} style={{ ...inputStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Upload size={16} /> 백업 불러오기</span>
                    <strong>Import</strong>
                  </button>
                  <input ref={fileInputRef} type="file" accept="application/json" onChange={importBackup} style={{ display: 'none' }} />
                </div>

                <div style={{ marginTop: 20, background: theme.softCard, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 14 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: theme.gold, fontWeight: 900, marginBottom: 8 }}><Home size={17} /> 홈화면 설치 안내</div>
                  <p style={{ color: theme.sub, lineHeight: 1.6, fontSize: 13, margin: 0 }}>
                    iPhone Safari에서는 공유 버튼을 누른 뒤 “홈 화면에 추가”를 선택하세요. Android Chrome에서는 우측 상단 메뉴에서 “홈 화면에 추가”를 선택하면 앱처럼 열 수 있습니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
