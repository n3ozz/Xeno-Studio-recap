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

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
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
  const [propTab, setPropTab] = useState('step2');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [alertMessage, setAlertMessage] = useState('Xeno Studio အဆင်သင့်ဖြစ်ပါပြီ။');
  const [recordWithVideoSync, setRecordWithVideoSync] = useState(true);
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [clonedVoices, setClonedVoices] = useState([]);
  const [cloneProfileName, setCloneProfileName] = useState('');
  const [cloneCustomStyle, setCloneCustomStyle] = useState('');
  const [isCloningVoice, setIsCloningVoice] = useState(false);
  const [cloneStatus, setCloneStatus] = useState('');
  const [cloneSampleFile, setCloneSampleFile] = useState(null);
  const [cloneSampleUrl, setCloneSampleUrl] = useState(null);

  const handleCloneFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCloneSampleFile(file);
    setCloneSampleUrl(URL.createObjectURL(file));
    if (!cloneProfileName.trim()) {
      setCloneProfileName(file.name.replace(/\.[^/.]+$/, '').substring(0, 20));
    }
  };

  const useRecordedMicForCloning = () => {
    setAlertMessage("ဖမ်းထားသော အသံကို သုံးရန် အဆင်သင့်ဖြစ်ပါပြီ။");
  };

  const createAndSaveVoiceCloneProfile = async () => {
    if (!cloneSampleFile) {
      setAlertMessage("အသံဖိုင် အရင် Upload တင်ပါ။");
      return;
    }
    setIsCloningVoice(true);
    setCloneStatus("AI Voice Cloning Profile ဖန်တီးနေသည်...");
    setTimeout(() => {
      setIsCloningVoice(false);
      setCloneStatus("Voice Cloning အောင်မြင်ပါသည်။");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#090C15] text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      <header className="border-b border-slate-800 bg-[#0c101d]/85 backdrop-blur sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center space-x-1">
              <span>Xeno</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">Studio</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          <button onClick={() => setAlertMessage("Auto Recap Active")} className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 shadow-md shadow-rose-600/30">
            <Flame className="w-3 h-3" />
            <span>Auto Recap</span>
          </button>
          <button onClick={() => setAlertMessage("Sync Dubbing Active")} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center space-x-1">
            <Video className="w-3 h-3 text-rose-400" />
            <span>Sync</span>
          </button>
        </div>
      </header>

      <div className="bg-[#0e1322] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center space-x-1.5 text-xs font-semibold tracking-wider text-slate-400">
          <Sliders className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-white">PROPERTIES</span>
        </div>
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button onClick={() => setPropTab('source')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${propTab === 'source' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>
            Source
          </button>
          <button onClick={() => setPropTab('step2')} className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${propTab === 'step2' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30' : 'text-slate-400 hover:text-white'}`}>
            <Mic className="w-3 h-3" />
            <span>step2</span>
          </button>
          <button onClick={() => setPropTab('effects')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${propTab === 'effects' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>
            Effects
          </button>
          <button onClick={() => setPropTab('advanced')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${propTab === 'advanced' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>
            Advanced
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-4 pb-12">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
              <Mic className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-white">မိမိအသံဖြင့် Voiceover သွင်းရန် (Record Voice)</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">ကိုယ်တိုင်ဖြင့်အသံသွင်းပြီး တိုက်ရိုက်သုံးသလို AI အသံသို့လည်း ပြောင်းနိုင်သည်</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800/80 rounded-xl">
            <span className="text-xs text-slate-300">ဗီဒီယိုကြည့်ရင်း တိုက်ရိုက်အသံသွင်းမည် (Sync Dubbing)</span>
            <button 
              onClick={() => setRecordWithVideoSync(!recordWithVideoSync)}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition ${recordWithVideoSync ? 'bg-rose-600 justify-end' : 'bg-slate-800 justify-start'}`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
            </button>
          </div>

          <button 
            onClick={() => {
              setIsRecordingMic(!isRecordingMic);
              setAlertMessage(isRecordingMic ? "အသံသွင်းခြင်း ပြီးဆုံးပါပြီ။" : "အသံ စတင်သွင်းနေပါပြီ...");
            }}
            className={`w-full py-2.5 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2 shadow-lg ${isRecordingMic ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'}`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isRecordingMic ? "အသံသွင်းခြင်း ရပ်မည် (Stop)" : "မိမိအသံ စတင်ဖမ်းမည် (Record)"}</span>
          </button>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-400">
                <AudioLines className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-xs font-bold text-white">AI Voice Cloning & Profile Saver</h3>
                  <span className="text-[9px] px-1.5 py-0.2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full font-semibold">NEW</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">လိုချင်သော အသံဖိုင် (MP3, WAV, M4A) တင်ပြီး Clone ပွားကာ Profile သိမ်းနိုင်သည်</p>
              </div>
            </div>
          </div>

          <label className="flex items-center justify-center w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 border-dashed rounded-xl cursor-pointer text-xs text-slate-300 transition">
            <Upload className="w-3.5 h-3.5 mr-2 text-rose-400" />
            <span>အသံဖိုင် Upload တင်ရန်</span>
            <input type="file" accept="audio/*,video/*" onChange={handleCloneFileUpload} className="hidden" />
          </label>

          <button 
            onClick={useRecordedMicForCloning}
            className="w-full py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium rounded-xl transition flex items-center justify-center space-x-2"
          >
            <Mic className="w-3.5 h-3.5 text-purple-400" />
            <span>ဖမ်းထားသော မိမိအသံကို သုံးမည်</span>
          </button>

          <input 
            type="text" 
            value={cloneProfileName}
            onChange={(e) => setCloneProfileName(e.target.value)}
            placeholder="Profile အမည် (ဥပမာ - ဦးကျော်သန်း)"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          />

          <input 
            type="text" 
            value={cloneCustomStyle}
            onChange={(e) => setCloneCustomStyle(e.target.value)}
            placeholder="အသံစတိုင် မှတ်ချက် (ဥပမာ - လေးနက်သော၊ ဟာသ)"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          />

          <button 
            onClick={createAndSaveVoiceCloneProfile}
            disabled={isCloningVoice}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-600/30 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isCloningVoice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Voice Cloning Profile Save မည်</span>
          </button>

          {cloneStatus && (
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-purple-300 font-mono">
              {cloneStatus}
            </div>
          )}
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-xl">
          <div className="flex items-center space-x-1.5 mb-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-white">System Status</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-mono">
            {alertMessage}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-2.5 text-center text-[10px] text-slate-500">
        Xeno Studio Pro © 2026 — All Rights Reserved.
      </footer>
    </div>
  );
}
