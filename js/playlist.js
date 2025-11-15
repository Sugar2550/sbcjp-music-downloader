let playlist = JSON.parse(localStorage.getItem('playlist') || '[]');
let isLoopAllEnabled = localStorage.getItem('playlistLoopEnabled') === 'true';
let audio = new Audio();
let playingIndex = null;

function savePlaylist() {
  localStorage.setItem('playlist', JSON.stringify(playlist));
}

function renderPlaylist() {
  const tbody = document.getElementById('playlist-tbody');
  if (!playlist.length) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">プレイリストは空です。</td></tr>`;
    return;
  }
  tbody.innerHTML = '';
  playlist.forEach((track, i) => {
    const isPlaying = playingIndex === i && !audio.paused;
    tbody.innerHTML += `
      <tr>
        <td class="song-title">${track.title}</td>
        <td><button class="simple-btn" onclick="playFromPlaylist(${i})">${isPlaying ? "⏸ 停止" : "▶ 再生"}</button></td>
        <td><button class="simple-btn" onclick="removeFromPlaylist(${i})">削除</button></td>
      </tr>`;
  });
}

let mediaSessionInitialized = false;

window.playFromPlaylist = function(i) {
  if (audio.src !== playlist[i].file) {
    audio.src = playlist[i].file;
    playingIndex = i;
  } else {
    audio.paused ? audio.play() : audio.pause();
  }

  if (playingIndex !== null && 'mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: playlist[playingIndex].title,
      artist: playlist[playingIndex].artist || '',
      album: playlist[playingIndex].album || '',
      artwork: [
        { src: playlist[playingIndex].artwork || '/images/default.png', sizes: '512x512', type: 'image/png' }
      ]
    });

    if (!mediaSessionInitialized) {
      navigator.mediaSession.setActionHandler('play', () => audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (playingIndex > 0) playFromPlaylist(playingIndex - 1);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (playingIndex + 1 < playlist.length) playFromPlaylist(playingIndex + 1);
      });
      mediaSessionInitialized = true;
    }
  }

  audio.play(); 
  renderPlaylist();
};

audio.addEventListener('ended', () => {
  if (playingIndex !== null) {
    if (playingIndex + 1 < playlist.length) {
      playFromPlaylist(playingIndex + 1);
    } else if (isLoopAllEnabled) {
      playFromPlaylist(0);
    } else {
      playingIndex = null;
      renderPlaylist();
    }
  }
});

window.removeFromPlaylist = function(i) {
  playlist.splice(i, 1);
  savePlaylist();
  renderPlaylist();
};
window.clearPlaylist = function() {
  playlist = [];
  localStorage.removeItem('playlist');
  renderPlaylist();
};

function encodeCompressed(str) {
  const data = new TextEncoder().encode(str);
  const deflated = pako.deflate(data);
  let bin = '';
  deflated.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeCompressed(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const inflated = pako.inflate(bytes);
  return new TextDecoder().decode(inflated);
}

function sharePlaylist() {
  if (!playlist.length) return alert("プレイリストが空です");
  const ids = playlist.map(t => t.file).join(',');
  const encoded = encodeCompressed(ids);
  const url = `${location.origin}/playlist.html?sd=${encoded}`;
  navigator.clipboard.writeText(url)
    .then(() => alert("共有リンクをコピーしました！"))
    .catch(() => alert("コピーに失敗しました。"));
}

const shared = new URLSearchParams(location.search).get('sd');
if (shared) {
  try {
    const decoded = decodeCompressed(shared);
    const files = decoded.split(',');
    Promise.all([
      fetch('/songs_mp3.json').then(r => r.json()),
      fetch('/songs_ogg.json').then(r => r.json()).catch(() => []),
    ])
    .then(([mp3, ogg]) => {
      playlist = [...mp3, ...ogg].filter(t => files.includes(t.file));
      renderPlaylist();
    });
  } catch (e) {
    console.error(e);
    alert("無効な共有リンクです。");
  }
} else {
  renderPlaylist();
}

const loopToggle = document.getElementById('loopToggle');
if (loopToggle) {
  loopToggle.checked = isLoopAllEnabled;
  
  loopToggle.addEventListener('change', () => {
    isLoopAllEnabled = loopToggle.checked;
    localStorage.setItem('playlistLoopEnabled', isLoopAllEnabled);
  });
}
