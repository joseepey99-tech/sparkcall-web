'use client'
import { Mic, MicOff, Video, VideoOff, MessageCircle, Gift, PhoneOff } from 'lucide-react'

export default function CallControls({
  muted = false, camOff = false, onToggleMute, onToggleCam,
  showChat = false, chatActive = false, onToggleChat,
  showGift = false, giftActive = false, onToggleGift,
  onEnd, ending = false,
}) {
  return (
    <div className="cc-bar">
      <button className={`cc-btn${muted ? ' cc-off' : ''}`} onClick={onToggleMute}
        title={muted ? 'Unmute' : 'Mute'} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}>
        {muted ? <MicOff size={22} /> : <Mic size={22} />}
      </button>
      <button className={`cc-btn${camOff ? ' cc-off' : ''}`} onClick={onToggleCam}
        title={camOff ? 'Turn camera on' : 'Turn camera off'} aria-label={camOff ? 'Turn camera on' : 'Turn camera off'}>
        {camOff ? <VideoOff size={22} /> : <Video size={22} />}
      </button>
      {showChat && (
        <button className={`cc-btn${chatActive ? ' cc-chat-on' : ''}`} onClick={onToggleChat}
          title="Chat" aria-label="Chat">
          <MessageCircle size={22} />
        </button>
      )}
      {showGift && (
        <button className={`cc-btn cc-gift${giftActive ? ' cc-gift-on' : ''}`} onClick={onToggleGift}
          title="Send a gift" aria-label="Send a gift">
          <Gift size={22} />
        </button>
      )}
      <div className="cc-sep" />
      <button className="cc-end" onClick={onEnd} disabled={ending} title="End call" aria-label="End call">
        <PhoneOff size={24} />
      </button>

      <style>{`
        .cc-bar { display: flex; align-items: center; gap: 10px; padding: 8px 12px;
          background: rgba(255,255,255,0.07); backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 999px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
        .cc-btn { width: 48px; height: 48px; border-radius: 50%; border: none;
          background: rgba(255,255,255,0.1); color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform .15s ease, background .2s ease, color .2s ease, box-shadow .2s ease; }
        .cc-btn:hover { background: rgba(255,255,255,0.18); transform: translateY(-2px); }
        .cc-btn:active { transform: scale(0.94); }
        .cc-btn.cc-off { background: #fff; color: #14101f; }
        .cc-btn.cc-off:hover { background: #efe9fa; }
        .cc-btn.cc-chat-on { background: rgba(214,63,110,0.25); color: #ff7aa6; box-shadow: 0 0 0 1px rgba(214,63,110,0.5); }
        .cc-btn.cc-gift { color: #C9A46A; background: rgba(201,164,106,0.14); }
        .cc-btn.cc-gift:hover { background: rgba(201,164,106,0.24); }
        .cc-btn.cc-gift-on { background: rgba(201,164,106,0.3); box-shadow: 0 0 0 1px rgba(201,164,106,0.55); }
        .cc-sep { width: 1px; height: 28px; background: rgba(255,255,255,0.14); margin: 0 2px; }
        .cc-end { width: 68px; height: 48px; border-radius: 999px; border: none; cursor: pointer; color: #fff;
          background: linear-gradient(135deg, #E5487A, #B8305F);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 22px rgba(214,63,110,0.5);
          transition: transform .15s ease, box-shadow .2s ease, filter .2s ease; }
        .cc-end:hover { transform: translateY(-2px); filter: brightness(1.08); }
        .cc-end:active { transform: scale(0.95); }
        .cc-end:disabled { background: #555; box-shadow: none; cursor: not-allowed; transform: none; filter: none; }
        @media (max-width: 480px) {
          .cc-bar { gap: 6px; padding: 6px 8px; }
          .cc-btn { width: 42px; height: 42px; }
          .cc-end { width: 58px; height: 42px; }
        }
      `}</style>
    </div>
  )
}