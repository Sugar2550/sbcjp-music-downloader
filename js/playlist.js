let playlist = JSON.parse(localStorage.getItem('playlist') || '[]');
let isLoopAllEnabled = localStorage.getItem('playlistLoopEnabled') === 'true';
let audio = new Audio();
let playingIndex = null;
let allTracks = [];

function savePlaylist() {
  localStorage.setItem('playlist', JSON.stringify(playlist));
  updatePlaylistURL();
}

function updatePlaylistURL() {
  if (playlist.length === 0) {
    window.history.replaceState(null, '', window.location.pathname);
  } else {
    const ids = playlist.map(track => track.id).join(';');
    const url = `${window.location.pathname}?sd=${ids}`;
    window.history.replaceState(null, '', url);
  }
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
  if (playingIndex === i && audio.src === playlist[i].file) {
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  } else {
    audio.src = playlist[i].file;
    playingIndex = i;
    audio.play();
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
  updatePlaylistURL();
  renderPlaylist();
};

function sharePlaylist() {
  if (!playlist.length) return alert("プレイリストが空です");

  const url = window.location.toString();
  navigator.clipboard.writeText(url)
    .then(() => alert("共有リンクをコピーしました！"))
    .catch(() => alert("コピーに失敗しました。"));
}

Promise.all([
  fetch('/songs_mp3.json').then(r => r.json()),
  fetch('/songs_ogg.json').then(r => r.json()).catch(() => []),
])
.then(([mp3, ogg]) => {

  allTracks = [...mp3, ...ogg];
  const shared = new URLSearchParams(location.search).get('sd');
  if (shared) {
    try {
      const ids = shared.split(';');
      
      playlist = ids
        .map(id => {
          const trimmedId = id.trim();
          const numId = isNaN(trimmedId) ? trimmedId : Number(trimmedId);
          return allTracks.find(t => t.id === numId);
        })
        .filter(t => t);
      savePlaylist();
    } catch (e) {
      console.error(e);
      alert("無効な共有リンクです。");
    }
  }
  
  renderPlaylist();
});

const loopToggle = document.getElementById('loopToggle');
if (loopToggle) {
  loopToggle.checked = isLoopAllEnabled;
  
  loopToggle.addEventListener('change', () => {
    isLoopAllEnabled = loopToggle.checked;
    localStorage.setItem('playlistLoopEnabled', isLoopAllEnabled);
  });
}