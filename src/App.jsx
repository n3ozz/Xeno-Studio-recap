import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, Volume2, VolumeX, Video, Flame, Copy, CheckCircle, Download,
  Loader2, X, History, Moon, Sun, Layout, FileText, ChevronDown, 
  MoveVertical, MoveHorizontal, List, Image as ImageIcon, AlertTriangle,
  Film, Play, Pause, RefreshCw, Wand2, Link2, ClipboardPaste, Zap,
  Sliders, Subtitles, RotateCcw, RotateCw, ShieldAlert, EyeOff, Mic, Settings, Crown,
  Trash2, Upload, BookmarkCheck, AudioLines, Smartphone, Monitor, Globe, Key, Terminal, Rocket
} from 'lucide-react';

// =========================================================================
// 📦 CORE UTILITIES (Exponential Backoff & Audio/Video Processing)
// =========================================================================

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

const handleDownload = (url, fileName) => {
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); }, 100);
  } catch (error) {
    console.error("Download failed:", error);
  }
};

const downloadTextFile = (content, fileName) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  handleDownload(url, fileName);
  setTimeout(() => URL.revokeObjectURL(url), 500);
};

// =========================================================================
// 🚀 VERCEL DEPLOYMENT READY-MADE CONFIG FILES
// =========================================================================

const VERCEL_FILES = {
  packageJson: JSON.stringify(
    {
      name: "xeno-studio",
      private: true,
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview"
      },
      dependencies: {
        "lucide-react": "^0.468.0",
        "react": "^18.3.1",
        "react-dom": "^18.3.1"
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.3.4",
        "vite": "^6.0.1"
      }
    },
    null,
    2
  ),
  indexHtml: `<!DOCTYPE html>
<html lang="my">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#090C15" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <title>Xeno Studio - AI Auto Recap & Voice Cloning</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-[#090C15] text-slate-100">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
  viteConfig: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`,
  mainJsx: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
};

const handleCanvasDownload = (canvasRef, fileName, setAlertMessage) => {
  if (!canvasRef.current) return;
  try {
    canvasRef.current.toBlob((blob) => {
      if (!blob) {
        if (setAlertMessage) setAlertMessage("ပုံကို Download ဆွဲရန် အဆင်မပြေပါ။ ပြန်လည်ကြိုးစားကြည့်ပါ။");
        return;
      }
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { 
        document.body.removeChild(link); 
        URL.revokeObjectURL(blobUrl); 
      }, 100);
    }, 'image/png', 1.0);
  } catch (error) {
    if (setAlertMessage) setAlertMessage("ပုံ Download ဆွဲရာတွင် အမှားအယွင်းဖြစ်နေပါသည်။");
  }
};

async function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2;
  const out = new ArrayBuffer(44 + length);
  const view = new DataView(out);
  const channels = [];
  let sample = 0; let offset = 0; let pos = 0;
  
  const setUint16 = (data) => { view.setUint16(pos, data, true); pos += 2; };
  const setUint32 = (data) => { view.setUint32(pos, data, true); pos += 4; };
  
  setUint32(0x46464952); setUint32(36 + length); setUint32(0x45564157); setUint32(0x20746d66);
  setUint32(16); setUint16(1); setUint16(numOfChan); setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); setUint16(numOfChan * 2); setUint16(16);
  setUint32(0x61746164); setUint32(length);
  
  for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
  
  while (pos < out.byteLength) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true); pos += 2;
    }
    offset++;
    if (offset % 50000 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return new Blob([out], { type: "audio/wav" });
}

const extractAudioFromVideo = async (file) => {
  let audioContext = null;
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const safeDuration = Math.max(1, Math.min(audioBuffer.duration, 600));
    const offlineContext = new OfflineAudioContext(1, Math.floor(safeDuration * 16000), 16000); 
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();
    const renderedBuffer = await offlineContext.startRendering();
    
    const wavBlob = await audioBufferToWav(renderedBuffer);
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.readAsDataURL(wavBlob);
      reader.onload = () => resolve({ base64: reader.result.split(',')[1], mimeType: 'audio/wav' });
    });
  } catch (e) {
    return null; 
  } finally {
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close().catch(() => {});
    }
  }
};

const extractFrameSafely = (videoFile, percentage = 0.5) => {
  return new Promise((resolve) => {
    let videoUrl = '';
    try {
      videoUrl = URL.createObjectURL(videoFile);
      const video = document.createElement('video');
      video.muted = true; 
      video.playsInline = true;
      const timeoutId = setTimeout(() => { 
        if (videoUrl) URL.revokeObjectURL(videoUrl); 
        resolve(null); 
      }, 4000);

      video.onloadeddata = () => { 
        video.currentTime = Math.min(1, video.duration > 0 ? video.duration * percentage : 0.5); 
      };
      video.onseeked = () => {
        clearTimeout(timeoutId);
        try {
          const canvas = document.createElement('canvas'); 
          canvas.width = 540; 
          canvas.height = 960;
          const ctx = canvas.getContext('2d'); 
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6); 
          if (videoUrl) URL.revokeObjectURL(videoUrl); 
          resolve(dataUrl);
        } catch(err) { 
          if (videoUrl) URL.revokeObjectURL(videoUrl); 
          resolve(null); 
        }
      };
      video.onerror = () => { 
        clearTimeout(timeoutId); 
        if (videoUrl) URL.revokeObjectURL(videoUrl); 
        resolve(null); 
      };
      video.src = videoUrl; 
      video.load(); 
    } catch (e) { 
      resolve(null); 
    }
  });
};

const splitTextIntoChunks = (text, maxChars = 350) => {
  const sentences = text.split(/(?<=[။.\n!?”"'])/g);
  const chunks = []; 
  let currentChunk = '';
  for (let sentence of sentences) {
    while (sentence.length > maxChars) {
       if (currentChunk.trim()) { chunks.push(currentChunk.trim()); currentChunk = ''; }
       let breakPoint = sentence.lastIndexOf(' ', maxChars);
       if (breakPoint === -1 || breakPoint === 0) breakPoint = maxChars; 
       chunks.push(sentence.substring(0, breakPoint).trim());
       sentence = sentence.substring(breakPoint).trim();
    }
    if ((currentChunk + sentence).length > maxChars) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else { 
      currentChunk += sentence; 
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks.filter(c => c.length > 0);
};

function pcmToWav(pcmData, sampleRate) {
  const numChannels = 1, bytesPerSample = 2, blockAlign = numChannels * bytesPerSample, byteRate = sampleRate * blockAlign, dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize); 
  const view = new DataView(buffer);
  const writeString = (offset, string) => { 
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i)); 
  };
  writeString(0, 'RIFF'); 
  view.setUint32(4, 36 + dataSize, true); 
  writeString(8, 'WAVE'); 
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); 
  view.setUint16(20, 1, true); 
  view.setUint16(22, numChannels, true); 
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true); 
  view.setUint16(32, blockAlign, true); 
  view.setUint16(34, bytesPerSample * 8, true); 
  writeString(36, 'data'); 
  view.setUint32(40, dataSize, true);
  new Uint8Array(buffer, 44).set(pcmData);
  return new Blob([buffer], { type: 'audio/wav' });
}

function base64ToUint8Array(base64) {
  const binaryString = window.atob(base64); 
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

// 📦 SRT CONVERSION UTILITIES
const formatTimeToSRT = (timeStr, secondsToAdd = 0) => {
  let [mm, ss] = timeStr.split(':').map(Number);
  let totalSeconds = mm * 60 + ss + secondsToAdd;
  const h = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},000`;
};

const convertToSRT = (script) => {
  if (!script) return '';
  const lines = script.split('\n').map(l => l.trim()).filter(l => l.match(/^[*-]?\s*\[\d{1,2}:\d{2}\]/) || l.match(/^\[\d{1,2}:\d{2}\]/));
  let srtOutput = '';
  
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    const match = currentLine.match(/^(?:[*-]\s+)?\[(\d{1,2}:\d{2})\]\s*(.*)/);
    if (!match) continue;
    
    const timeStr = match[1]; 
    const text = match[2].trim();
    
    const startTime = formatTimeToSRT(timeStr, 0); 
    
    let endTimeStr = '';
    if (i < lines.length - 1) {
      const nextMatch = lines[i+1].match(/^(?:[*-]\s+)?\[(\d{1,2}:\d{2})\]/);
      if (nextMatch) {
        endTimeStr = formatTimeToSRT(nextMatch[1], 0);
      } else {
         endTimeStr = formatTimeToSRT(timeStr, 3);
      }
    } else {
       endTimeStr = formatTimeToSRT(timeStr, 3);
    }
    
    srtOutput += `${i + 1}\n${startTime} --> ${endTimeStr}\n${text}\n\n`;
  }
  return srtOutput;
};

const parseScriptSegments = (script) => {
  if (!script) return [];
  const lines = script.split('\n').map(l => l.trim()).filter(Boolean);
  const segments = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(?:[*-]\s+)?\[(\d{1,2}):(\d{2})\]\s*(.*)/);
    if (!match) continue;
    const startSec = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    const text = match[3].trim();
    segments.push({ id: i, startSec, endSec: startSec + 3, text });
  }
  for (let i = 0; i < segments.length; i++) {
    if (i < segments.length - 1) {
      segments[i].endSec = Math.max(segments[i].startSec + 0.5, segments[i + 1].startSec);
    } else {
      segments[i].endSec = segments[i].startSec + 4;
    }
  }
  return segments;
};

const formatSecLabel = (sec) => {
  const safe = Math.max(0, Number(sec) || 0);
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatFullTimecode = (sec) => {
  const safe = Math.max(0, Number(sec) || 0);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const f = Math.floor((safe % 1) * 30);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
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

const TONE_MODELS = [
  { id: 'Neutral', label: 'Neutral / Standard', promptModifier: '' }, 
  { id: 'BhoneBhoneTone', label: 'ဘုန်းဘုန်း တရားဟောသံ (Dhamma Sermon)', promptModifier: 'Speak slowly, peacefully, deeply, and compassionately with the calm, dignified cadence and intonation of a Myanmar Buddhist monk preaching a Dhamma sermon: ' },
  { id: 'Empathetic', label: 'Empathetic & Warm', promptModifier: 'Say warmly and empathetically: ' }, 
  { id: 'Cheerful', label: 'Cheerful', promptModifier: 'Say cheerfully and happily: ' }, 
  { id: 'News', label: 'News Anchor', promptModifier: 'Read this professionally like a news anchor: ' }, 
  { id: 'Soft', label: 'Soft & Calm', promptModifier: 'Say softly and calmly: ' }
];

const TK_THEMES = { 
  Gold: { color: '#FFD700', shadow: '#B8860B' }, 
  Toxic: { color: '#39FF14', shadow: '#008000' }, 
  Crimson: { color: '#FF003F', shadow: '#8B0000' }, 
  Cyber: { color: '#00FFFF', shadow: '#008B8B' } 
};

// =========================================================================
// 🎨 MAIN XENO STUDIO AUTO RECAP APP (CROSS-PLATFORM & VERCEL READY)
// =========================================================================

export default function App() {
  const [activeTab, setActiveTab] = useState('v2s'); 
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [alertMessage, setAlertMessage] = useState('');
  
  // Cross-Platform App Installer & Vercel Guide Modal State
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [platformGuideTab, setPlatformGuideTab] = useState('vercel'); // 'vercel' | 'pwa' | 'desktop' | 'mobile' | 'apikey'
  const [deferredPwaPrompt, setDeferredPwaPrompt] = useState(null);
  const [customApiKey, setCustomApiKey] = useState(() => {
    try {
      return localStorage.getItem('xeno_gemini_api_key') || '';
    } catch (e) {
      return '';
    }
  });

  const apiKey = customApiKey.trim() || "";

  const saveCustomApiKey = (val) => {
    setCustomApiKey(val);
    try {
      localStorage.setItem('xeno_gemini_api_key', val.trim());
    } catch (e) {
      console.warn("Storage unavailable");
    }
  };

  const downloadAllVercelConfigFiles = () => {
    downloadTextFile(VERCEL_FILES.packageJson, 'package.json');
    setTimeout(() => downloadTextFile(VERCEL_FILES.indexHtml, 'index.html'), 250);
    setTimeout(() => downloadTextFile(VERCEL_FILES.viteConfig, 'vite.config.js'), 500);
    setTimeout(() => downloadTextFile(VERCEL_FILES.mainJsx, 'main.jsx'), 750);
  };

  // Inject PWA Web Manifest & Mobile Web App Meta Tags
  useEffect(() => {
    try {
      const manifestObj = {
        name: "Xeno Studio - AI Auto Recap & Voice Cloning",
        short_name: "Xeno Studio",
        description: "AI Video Recap, Burmese Voiceover, Voice Cloning & TikTok Studio for Phone, Windows & MacBook",
        start_url: ".",
        display: "standalone",
        background_color: "#090C15",
        theme_color: "#E11D48",
        icons: [
          {
            src: "https://cdn-icons-png.flaticon.com/512/10466/10466151.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      };
      const manifestBlob = new Blob([JSON.stringify(manifestObj)], { type: 'application/manifest+json' });
      const manifestUrl = URL.createObjectURL(manifestBlob);
      let linkEl = document.querySelector('link[rel="manifest"]');
      if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.rel = 'manifest';
        document.head.appendChild(linkEl);
      }
      linkEl.href = manifestUrl;

      const metaApple = document.createElement('meta');
      metaApple.name = 'apple-mobile-web-app-capable';
      metaApple.content = 'yes';
      document.head.appendChild(metaApple);
    } catch (e) {
      console.warn("PWA manifest setup skipped", e);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPwaPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const triggerPwaInstall = async () => {
    if (deferredPwaPrompt) {
      deferredPwaPrompt.prompt();
      await deferredPwaPrompt.userChoice;
      setDeferredPwaPrompt(null);
    } else {
      setPlatformGuideTab('vercel');
      setShowPlatformModal(true);
    }
  };

  const handleCopy = (text, id) => {
    if (!text) return;
    const ta = document.createElement("textarea"); 
    ta.value = text; 
    document.body.appendChild(ta); 
    ta.select();
    try { 
      document.execCommand('copy'); 
      setCopiedId(id); 
      setTimeout(() => setCopiedId(null), 2000); 
    } catch (err) {
      console.error("Copy failed", err);
    } 
    document.body.removeChild(ta);
  };

  // --- TEAM ALPHA AI & DeepClip Unified Properties State ---
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [useFileUploadMode, setUseFileUploadMode] = useState(false);
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [linkFetchStatus, setLinkFetchStatus] = useState('');
  const [fetchedLinkMeta, setFetchedLinkMeta] = useState(null);

  const [propTab, setPropTab] = useState('source');
  const [recapMode, setRecapMode] = useState('ai_recap');
  const [recapAspectRatio, setRecapAspectRatio] = useState('Original');
  const [exportResolution, setExportResolution] = useState('4K');
  const [videoFillMode, setVideoFillMode] = useState('crop');
  const [outputLanguage, setOutputLanguage] = useState('မြန်မာ');

  const [copyrightBypassZoom, setCopyrightBypassZoom] = useState(true);
  const [bypassZoomLevel, setBypassZoomLevel] = useState(1.10);
  const [mirrorFlip, setMirrorFlip] = useState(false);
  const [colorEnhanceFilter, setColorEnhanceFilter] = useState(true);
  const [origAudioVolume, setOrigAudioVolume] = useState(0.12);

  const [showLogoOverlay, setShowLogoOverlay] = useState(true);
  const [showOriginalSubBlur, setShowOriginalSubBlur] = useState(false);
  const [subBlurY, setSubBlurY] = useState(82);
  const [subBlurHeight, setSubBlurHeight] = useState(11);
  const [showSubtitlesOverlay, setShowSubtitlesOverlay] = useState(true);
  const [isPreviewMuted, setIsPreviewMuted] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);

  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const [subColor, setSubColor] = useState('#FFD700');
  const [subBgOpacity, setSubBgOpacity] = useState(0.75);
  const [subFontSize, setSubFontSize] = useState(18);

  const [isRunningAutoRecap, setIsRunningAutoRecap] = useState(false);
  const [autoRecapStep, setAutoRecapStep] = useState('');

  // --- TTS State ---
  const [ttsText, setTtsText] = useState(''); 
  const [ttsSpeed, setTtsSpeed] = useState(1); 
  const [ttsAudioUrl, setTtsAudioUrl] = useState(null);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false); 
  const [ttsStatus, setTtsStatus] = useState(''); 
  const [ttsHistory, setTtsHistory] = useState([]);
  const audioRef = useRef(null);
  const [activeVoice, setActiveVoice] = useState(VOICE_MODELS.Male[0]); 
  const [activeTone, setActiveTone] = useState(TONE_MODELS[0]);
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false); 
  const [isToneDropdownOpen, setIsToneDropdownOpen] = useState(false);

  // --- User Microphone Voice Recording & Voiceover State ---
  const [isRecordingMic, setIsRecordingMic] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState(null);
  const [recordedVoiceBlob, setRecordedVoiceBlob] = useState(null);
  const [recordWithVideoSync, setRecordWithVideoSync] = useState(true);
  const [isConvertingRecordedVoice, setIsConvertingRecordedVoice] = useState(false);
  const [recordedVoiceStatus, setRecordedVoiceStatus] = useState('');
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // --- AI Voice Cloning & Saved Profiles State ---
  const [clonedVoices, setClonedVoices] = useState(() => {
    try {
      const saved = localStorage.getItem('xeno_cloned_voices');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [cloneSampleFile, setCloneSampleFile] = useState(null);
  const [cloneSampleUrl, setCloneSampleUrl] = useState(null);
  const [cloneProfileName, setCloneProfileName] = useState('');
  const [cloneCustomStyle, setCloneCustomStyle] = useState('');
  const [isCloningVoice, setIsCloningVoice] = useState(false);
  const [cloneStatus, setCloneStatus] = useState('');
  const [cloneInputKey, setCloneInputKey] = useState(`clone-${Date.now()}`);

  useEffect(() => {
    try {
      const serializable = clonedVoices.map(({ sampleUrl, ...rest }) => rest);
      localStorage.setItem('xeno_cloned_voices', JSON.stringify(serializable));
    } catch (e) {
      console.warn("Could not persist cloned voices");
    }
  }, [clonedVoices]);

  const handleCloneFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setAlertMessage("အသံဖိုင် Size သည် 50MB အောက်သာ ဖြစ်ရပါမည်။");
      setCloneInputKey(`clone-${Date.now()}`);
      return;
    }
    if (cloneSampleUrl) URL.revokeObjectURL(cloneSampleUrl);
    const url = URL.createObjectURL(file);
    setCloneSampleFile(file);
    setCloneSampleUrl(url);
    if (!cloneProfileName.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').substring(0, 22);
      setCloneProfileName(baseName || 'Cloned Voice');
    }
    setCloneInputKey(`clone-${Date.now()}`);
  };

  const useRecordedMicForCloning = () => {
    if (!recordedVoiceBlob || !recordedVoiceUrl) {
      setAlertMessage("မိမိအသံကို အရင် Record ဖမ်းပေးပါ။");
      return;
    }
    const file = new File([recordedVoiceBlob], `My_Recorded_Voice_${Date.now()}.wav`, {
      type: recordedVoiceBlob.type || 'audio/wav'
    });
    setCloneSampleFile(file);
    setCloneSampleUrl(recordedVoiceUrl);
    if (!cloneProfileName.trim()) {
      setCloneProfileName(`မိမိအသံ Profile (${clonedVoices.length + 1})`);
    }
  };

  const createAndSaveVoiceCloneProfile = async () => {
    if (!cloneSampleFile) {
      setAlertMessage("Clone ပွားလိုသော အသံဖိုင် (MP3/WAV/M4A) ကို အရင် Upload တင်ပါ သို့မဟုတ် မိမိအသံ Record ယူပါ။");
      return;
    }
    const finalName = cloneProfileName.trim() || `Cloned Voice #${clonedVoices.length + 1}`;
    setIsCloningVoice(true);
    setCloneStatus("အသံဖိုင်၏ လေယူလေသိမ်း၊ အနိမ့်အမြင့်နှင့် အသံဩဇာ (Acoustic Timbre) ကို စစ်ဆေးနေသည်...");

    try {
      let audioBase64 = null;
      let audioMime = cloneSampleFile.type || 'audio/wav';

      if (cloneSampleFile.size > 8 * 1024 * 1024 || audioMime.startsWith('video/')) {
        setCloneStatus("အသံဖိုင်မှ အကြည်လင်ဆုံး အသံလှိုင်းကို ထုတ်ယူနေသည်...");
        const extracted = await extractAudioFromVideo(cloneSampleFile);
        if (extracted) {
          audioBase64 = extracted.base64;
          audioMime = extracted.mimeType;
        }
      }
      if (!audioBase64) {
        audioBase64 = (await fileToBase64(cloneSampleFile)).split(',')[1];
      }

      setCloneStatus("AI Voice Cloning Engine ဖြင့် အသံပုံစံတူ Profile တည်ဆောက်နေသည်...");

      const analysisPrompt = `You are an expert acoustic voice cloning engineer. Listen carefully to the uploaded voice sample and analyze the speaker's exact vocal characteristics: gender, fundamental pitch, timbre, speaking pace, emotional tone, resonance, cadence, and Myanmar speaking style.
${cloneCustomStyle.trim() ? `User's additional style note: "${cloneCustomStyle.trim()}"` : ''}

Return a JSON object matching this exact structure:
{
  "gender": "Male or Female",
  "bestBaseVoice": "Choose the closest matching prebuilt voice ID from: Charon (deep/resonant/monk/mature male), Zephyr (clear/bright male), Fenrir (strong/energetic male), Kore (clear/firm female), Aoede (warm/breezy female), Leda (youthful/bright female)",
  "recommendedSpeed": 1.0,
  "shortDesc": "A concise 3-5 word Burmese description of this voice (e.g., တည်ငြိမ်ဩဇာရှိသော အသံ)",
  "voicePrompt": "A detailed English instruction prefix for a TTS model to replicate this exact speaker's voice timbre, pitch, pacing, pauses, warmth, and emotional cadence (ending with a colon and space, e.g. 'Speak with a deep, warm, steady, authoritative cadence matching the cloned speaker: ')"
}`;

      const payload = {
        contents: [
          {
            parts: [
              { text: analysisPrompt },
              { inlineData: { mimeType: audioMime, data: audioBase64 } }
            ]
          }
        ],
        generationConfig: { responseMimeType: "application/json" }
      };

      let parsedProfile = {
        gender: 'Male',
        bestBaseVoice: 'Charon',
        recommendedSpeed: 1.0,
        shortDesc: 'AI Cloned Voice',
        voicePrompt: `Speak naturally matching the exact vocal tone, cadence, pitch, and expression of ${finalName}${cloneCustomStyle ? ` (${cloneCustomStyle})` : ''}: `
      };

      try {
        const res = await fetchWithExponentialBackoff(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );
        const rawJson = res.candidates?.[0]?.content?.parts?.[0]?.text
          ?.replace(/```json\n?/g, '')
          ?.replace(/```\n?/g, '')
          ?.trim();
        if (rawJson) {
          const aiData = JSON.parse(rawJson);
          const validVoices = ['Charon', 'Zephyr', 'Fenrir', 'Kore', 'Aoede', 'Leda'];
          parsedProfile = {
            gender: aiData.gender === 'Female' ? 'Female' : 'Male',
                        bestBaseVoice: validVoices.includes(aiData.bestBaseVoice) ? aiData.bestBaseVoice : 'Charon',
            recommendedSpeed: Number(aiData.recommendedSpeed) || 1.0,
            shortDesc: aiData.shortDesc || 'AI Cloned Voice',
            voicePrompt: aiData.voicePrompt || `Speak matching the cloned voice of ${finalName}: `
          };
        }
      } catch (e) {
        console.warn("AI voice analysis fallback", e);
      }

      const newVoiceObj = {
        id: `clone-${Date.now()}`,
        name: finalName,
        gender: parsedProfile.gender,
        desc: parsedProfile.shortDesc,
        apiVoice: parsedProfile.bestBaseVoice,
        voicePrompt: parsedProfile.voicePrompt,
        recommendedSpeed: parsedProfile.recommendedSpeed,
        sampleUrl: cloneSampleUrl
      };

      setClonedVoices(prev => [newVoiceObj, ...prev]);
      setActiveVoice(newVoiceObj);
      setCloneStatus(`အောင်မြင်ပါသည်။ "${finalName}" Voice Clone Profile တည်ဆောက်ပြီးပါပြီ။`);
      setCloneSampleFile(null);
      setCloneSampleUrl(null);
      setCloneProfileName('');
      setCloneCustomStyle('');
    } catch (err) {
      setCloneStatus(`အမှားအယွင်းဖြစ်ပွားသည်: ${err.message}`);
    } finally {
      setIsCloningVoice(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090C15] text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      <header className="border-b border-slate-800 bg-[#0c101d]/85 backdrop-blur sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Xeno <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 ml-2">Studio</span>
            </h1>
            <p className="text-xs text-slate-400">AI Video Auto Recap & Voice Cloning</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setAlertMessage("Auto Recap Active")} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 shadow-md shadow-rose-600/30">
            <Flame className="w-3.5 h-3.5" />
            <span>Auto Recap</span>
          </button>
          <button onClick={() => setAlertMessage("Sync Dubbing Active")} className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center space-x-1">
            <Video className="w-3.5 h-3.5 text-rose-400" />
            <span>Sync</span>
          </button>
        </div>
      </header>

      <div className="bg-[#0e1322] border-b border-slate-800 px-4 py-3 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center space-x-2 text-xs font-semibold tracking-wider text-slate-400">
          <Sliders className="w-4 h-4 text-rose-400 ml-1" />
          <span className="text-white">PROPERTIES</span>
        </div>
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button onClick={() => setPropTab('source')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${propTab === 'source' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>
            Source
          </button>
          <button onClick={() => setPropTab('step2')} className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${propTab === 'step2' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' : 'text-slate-400 hover:text-white'}`}>
            <Mic className="w-3.5 h-3.5" />
            <span>step2</span>
          </button>
          <button onClick={() => setPropTab('effects')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${propTab === 'effects' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>
            Effects
          </button>
          <button onClick={() => setPropTab('advanced')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${propTab === 'advanced' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}>
            Advanced
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-5 pb-12">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400">
              <Mic className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-white">မိမိအသံဖြင့် Voiceover သွင်းရန် (Record Voice)</h3>
              <p className="text-xs text-slate-400 mt-0.5">ကိုယ်တိုင်ဖြင့်အသံသွင်းပြီး တိုက်ရိုက်သုံးသလို AI အသံသို့လည်း ပြောင်းနိုင်သည်</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
            <span className="text-xs text-slate-300">ဗီဒီယိုကြည့်ရင်း တိုက်ရိုက်အသံသွင်းမည် (Sync Dubbing)</span>
            <button 
              onClick={() => setRecordWithVideoSync(!recordWithVideoSync)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition ${recordWithVideoSync ? 'bg-rose-600 justify-end' : 'bg-slate-800 justify-start'}`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
            </button>
          </div>

          <button 
            onClick={() => {
              setIsRecordingMic(!isRecordingMic);
              setAlertMessage(isRecordingMic ? "အသံသွင်းခြင်း ပြီးဆုံးပါပြီ။" : "အသံ စတင်သွင်းနေပါပြီ...");
            }}
            className={`w-full py-3 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2 shadow-lg ${isRecordingMic ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'}`}
          >
            <Mic className="w-4 h-4" />
            <span>{isRecordingMic ? "အသံသွင်းခြင်း ရပ်မည် (Stop Recording)" : "မိမိအသံ စတင်ဖမ်းမည် (Record)"}</span>
          </button>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-400">
                <AudioLines className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-white">AI Voice Cloning & Profile Saver</h3>
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full font-semibold">NEW</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">လိုချင်သော အသံဖိုင် (MP3, WAV, M4A) တင်ပြီး ထိုအသံအတိုင်း Clone ပွားကာ Profile သိမ်းထားနိုင်သည်</p>
              </div>
            </div>
          </div>

          <label className="flex items-center justify-center w-full py-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 border-dashed rounded-xl cursor-pointer text-xs text-slate-300 transition">
            <Upload className="w-4 h-4 mr-2 text-rose-400" />
            <span>အသံဖိုင် Upload တင်ရန်</span>
            <input type="file" accept="audio/*,video/*" onChange={handleCloneFileUpload} className="hidden" />
          </label>

          <button 
            onClick={useRecordedMicForCloning}
            className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 text-xs font-medium rounded-xl transition flex items-center justify-center space-x-2"
          >
            <Mic className="w-4 h-4 text-purple-400" />
            <span>ဖမ်းထားသော မိမိအသံကို သုံးမည်</span>
          </button>

          <input 
            type="text" 
            value={cloneProfileName}
            onChange={(e) => setCloneProfileName(e.target.value)}
            placeholder="Profile အမည် (ဥပမာ - ဦးကျော်သန်း)"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          />

          <input 
            type="text" 
            value={cloneCustomStyle}
            onChange={(e) => setCloneCustomStyle(e.target.value)}
            placeholder="အသံစတိုင် မှတ်ချက် (ဥပမာ - လေးနက်သော၊ ဟာသ)"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
          />

          <button 
            onClick={createAndSaveVoiceCloneProfile}
            disabled={isCloningVoice}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-600/30 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isCloningVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Voice Cloning Profile Save မည်</span>
          </button>

          {cloneStatus && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-purple-300 font-mono">
              {cloneStatus}
            </div>
          )}
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white">System Status</span>
          </div>
          <div className="text-xs text-emerald-400 font-mono">
            {alertMessage}
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-3 text-center text-[10px] text-slate-500">
        Xeno Studio Pro © 2026 — All Rights Reserved.
      </footer>
    </div>
  );
}
