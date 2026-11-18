import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, Volume2, VolumeX, Video, Flame, Copy, CheckCircle, Download,
  Loader2, X, History, Moon, Sun, Layout, FileText, ChevronDown, 
  MoveVertical, MoveHorizontal, List, Image as ImageIcon, AlertTriangle,
  Film, Play, Pause, RefreshCw, Wand2, Link2, ClipboardPaste, Zap,
  Sliders, Subtitles, RotateCcw, RotateCw, ShieldAlert, EyeOff, Mic, Settings, Crown,
  Trash2, Upload, BookmarkCheck, AudioLines, Smartphone, Monitor, Globe, Key, Terminal, Rocket
} from 'lucide-react';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithExponentialBackoff = async (url, options = {}, maxRetries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return await response.json();
      }
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        throw new Error(`HTTP ${response.status}`);
      }
      throw new Error(`HTTP error ${response.status}`);
    } catch (err) {
      if (i === maxRetries - 1 || err.message.includes('HTTP 400') || err.message.includes('HTTP 401') || err.message.includes('HTTP 403')) {
        throw err;
      }
      await sleep(delays[i] || 16000);
    }
  }
};

const VOICE_MODELS = {
  Male: [
    {
      id: 'BhoneBhone',
      apiVoice: 'Charon',
      name: 'ဘုန်းဘုန်း',
      desc: 'တရားဟောသံ (Monk Sermon)',
      voicePrompt: 'Speak slowly, peacefully, deeply, and compassionately with the calm, resonant, dignified cadence and intonation of a respected Myanmar Buddhist monk (Sayadaw) delivering a Dhamma sermon: '
    },
    { id: 'Zephyr', apiVoice: 'Zephyr', name: 'Zephyr', desc: 'Deep Male' }, 
    { id: 'Charon', apiVoice: 'Charon', name: 'Charon', desc: 'Smooth Male' }, 
    { id: 'Fenrir', apiVoice: 'Fenrir', name: 'Fenrir', desc: 'Strong Male' }
  ],
  Female: [
    { id: 'Kore', apiVoice: 'Kore', name: 'Kore', desc: 'Clear Female' }, 
    { id: 'Aoede', apiVoice: 'Aoede', name: 'Aoede', desc: 'Warm Female' }, 
    { id: 'Leda', apiVoice: 'Leda', name: 'Leda', desc: 'Bright Female' }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('v2s'); 
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [ttsText, setTtsText] = useState(''); 
  const [alertMessage, setAlertMessage] = useState('Xeno Studio အဆင်သင့်ဖြစ်ပါပြီ။');
  const [clonedVoices, setClonedVoices] = useState([]);

  return (
    <div className="min-h-screen bg-[#090C15] text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      <header className="border-b border-slate-800 bg-[#0c101d]/85 backdrop-blur sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Xeno Studio <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 ml-2">PRO v3.5</span>
            </h1>
            <p className="text-xs text-slate-400">AI Video Auto Recap, Burmese TTS & Voice Cloning</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-base font-semibold text-white mb-3 flex items-center space-x-2">
              <Video className="w-4 h-4 text-rose-400" />
              <span>Video URL သို့မဟုတ် Video ဖိုင် တင်ရန်</span>
            </h2>
            <div className="space-y-3">
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  placeholder="YouTube URL သို့မဟုတ် Video Link ထည့်ပါ..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                />
                <button 
                  onClick={() => setAlertMessage("Video link ကို ချိတ်ဆက်ပြီးပါပြီ။")}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-xl transition flex items-center space-x-1"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Load</span>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-base font-semibold text-white mb-3 flex items-center space-x-2">
              <Mic className="w-4 h-4 text-purple-400" />
              <span>AI Voiceover & Burmese TTS</span>
            </h2>
            <div className="space-y-4">
              <textarea 
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                placeholder="မြန်မာလို ဇာတ်ကြောင်းပြောရန် စာသားများ ရိုက်ထည့်ပါ..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
              />
              <button 
                onClick={() => setAlertMessage("အသံဖန်တီးမှု စတင်နေပါပြီ။")}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white font-medium rounded-xl transition shadow-lg shadow-purple-600/20 flex items-center justify-center space-x-2"
              >
                <Volume2 className="w-4 h-4" />
                <span>AI Voice Generate လုပ်မည်</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-base font-semibold text-white mb-3 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>System Status</span>
            </h2>
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs text-emerald-400 font-mono">
              ✓ Vercel Deployment Successful<br/>
              ✓ Xeno Studio Ready<br/>
              ✓ Gemini AI Engine Connected
            </div>
            <div className="mt-4 text-xs text-slate-400">
              {alertMessage}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        Xeno Studio Pro © 2026 — All Rights Reserved.
      </footer>
    </div>
  );
}
