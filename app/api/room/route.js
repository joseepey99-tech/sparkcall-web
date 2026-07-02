// app/api/room/route.js
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get('room') || ''

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <style>
    *{margin:0;padding:0;box-sizing:border-box;-webkit-user-select:none;user-select:none}
    html,body{width:100vw;height:100vh;background:#000;overflow:hidden;touch-action:none}
    #remote{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;background:#111;z-index:1}
    #local{
      position:fixed;top:60px;right:12px;
      width:90px;height:124px;
      object-fit:cover;border-radius:14px;
      border:2.5px solid rgba(255,255,255,0.4);
      background:#1a1a1a;z-index:10;
    }
  </style>
</head>
<body>
  <video id="remote" autoplay playsinline></video>
  <video id="local"  autoplay playsinline muted></video>

<script src="https://unpkg.com/@daily-co/daily-js"></script>
<script>
(function(){
  var roomUrl = ${JSON.stringify(room)};
  if(!roomUrl) return;

  var remoteEl = document.getElementById('remote');
  var localEl  = document.getElementById('local');

  /* ── Daily.co ── */
  var call = DailyIframe.createCallObject({ audioSource:true, videoSource:true });
  window.__daily = call;

  function updateTracks(){
    Object.values(call.participants()).forEach(function(p){
      var v = p.tracks && p.tracks.video;
      var t = v && (v.persistentTrack || v.track);
      if(!t) return;
      var el = p.local ? localEl : remoteEl;
      el.srcObject = new MediaStream([t]);
    });
  }
  call.on('joined-meeting',      updateTracks);
  call.on('participant-joined',  updateTracks);
  call.on('participant-updated', updateTracks);
  call.on('track-started',       updateTracks);
  call.join({ url: roomUrl }).catch(function(e){ console.error(e); });

  /* ── Controls ── */
  window.scMute       = function(){ call.setLocalAudio( call.localAudio()  === false ); };
  window.scVideo      = function(){ call.setLocalVideo( call.localVideo()  === false ); };
  window.scFlipCamera = function(){ call.cycleCamera && call.cycleCamera(); };
  window.scHideLocal  = function(){
    var hidden = localEl.style.opacity === '0';
    localEl.style.opacity = hidden ? '1' : '0';
  };

  /* ── PiP state ── */
  var swapped = false;
  var pipEl   = localEl;   // currently small video
  var mainEl  = remoteEl;  // currently fullscreen video

  var PIP_BASE = 'position:fixed;width:90px;height:124px;object-fit:cover;border-radius:14px;border:2.5px solid rgba(255,255,255,0.4);z-index:10;background:#1a1a1a;';
  var MAIN_CSS = 'position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;background:#111;border:none;border-radius:0;';

  window.scSwap = function(){
    swapped = !swapped;
    /* get current PiP position */
    var r  = pipEl.getBoundingClientRect();
    var px = r.left, py = r.top;
    /* just swap CSS — no srcObject change = instant, no buffering */
    if(swapped){
      localEl.style.cssText  = MAIN_CSS;
      remoteEl.style.cssText = PIP_BASE + 'left:' + px + 'px;top:' + py + 'px;right:auto;bottom:auto;';
      pipEl = remoteEl; mainEl = localEl;
    } else {
      remoteEl.style.cssText = MAIN_CSS;
      localEl.style.cssText  = PIP_BASE + 'left:' + px + 'px;top:' + py + 'px;right:auto;bottom:auto;';
      pipEl = localEl; mainEl = remoteEl;
    }
  };

  /* ── Touch: attached to BOTH elements, only pipEl responds ── */
  [localEl, remoteEl].forEach(function(el){
    var drag = { on:false, sx:0, sy:0, ox:0, oy:0, moved:false, t:0 };

    el.addEventListener('touchstart', function(e){
      /* always tell RN to show controls on any touch */
      try{ window.ReactNativeWebView.postMessage('showControls'); }catch(err){}
      if(el !== pipEl) return;
      e.preventDefault(); e.stopPropagation();
      var r = el.getBoundingClientRect(), t = e.touches[0];
      drag = { on:true, sx:t.clientX, sy:t.clientY, ox:r.left, oy:r.top, moved:false, t:Date.now() };
    }, { passive:false });

    el.addEventListener('touchmove', function(e){
      if(el !== pipEl || !drag.on) return;
      e.preventDefault(); e.stopPropagation();
      var t = e.touches[0], dx = t.clientX-drag.sx, dy = t.clientY-drag.sy;
      if(Math.abs(dx)>6||Math.abs(dy)>6) drag.moved = true;
      if(!drag.moved) return;
      var nx = Math.max(0, Math.min(window.innerWidth-90,  drag.ox+dx));
      var ny = Math.max(0, Math.min(window.innerHeight-124, drag.oy+dy));
      el.style.left='auto'; el.style.right='auto'; el.style.bottom='auto';
      el.style.left = nx+'px'; el.style.top = ny+'px';
    }, { passive:false });

    el.addEventListener('touchend', function(e){
      if(el !== pipEl) return;
      e.preventDefault(); e.stopPropagation();
      if(!drag.on) return;
      drag.on = false;
      if(!drag.moved && (Date.now()-drag.t)<200){
        window.scSwap();
      }
    }, { passive:false });
  });

})();
</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store',
      'Permissions-Policy': 'camera=*, microphone=*',
    }
  })
}
