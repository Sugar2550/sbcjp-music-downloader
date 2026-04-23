let playlist = JSON.parse(localStorage.getItem('playlist') || '[]');
let isLoopAllEnabled = localStorage.getItem('playlistLoopEnabled') === 'true';
let audio = new Audio();
let playingIndex = null;
let allTracks = [];

function savePlaylist() {
  localStorage.setItem('playlist', JSON.stringify(playlist));
}

function getSavedPlaylists() {
  return JSON.parse(localStorage.getItem('savedPlaylists') || '{}');
}

function saveSavedPlaylists(playlists) {
  localStorage.setItem('savedPlaylists', JSON.stringify(playlists));
}

function savePlaylistWithName() {
  const nameInput = document.getElementById('playlistNameInput');
  const name = nameInput.value.trim();

  if (!name) {
    alert('プレイリスト名を入力してください');
    return;
  }

  if (!playlist.length) {
    alert('プレイリストが空です');
    return;
  }

  const saved = getSavedPlaylists();
  if (saved[name]) {
    if (!confirm(`「${name}」は既に存在します。上書きしますか？`)) {
      return;
    }
  }

  saved[name] = {
    tracks: JSON.parse(JSON.stringify(playlist)),
    createdAt: new Date().toISOString(),
    trackCount: playlist.length
  };

  saveSavedPlaylists(saved);
  nameInput.value = '';
  renderSavedPlaylists();
  alert(`「${name}」として保存されました`);
}

function loadSavedPlaylist(name) {
  const saved = getSavedPlaylists();
  if (saved[name]) {
    playlist = JSON.parse(JSON.stringify(saved[name].tracks));
    savePlaylist();
    renderPlaylist();
  }
}

function deleteSavedPlaylist(name) {
  if (!confirm(`「${name}」を削除しますか？`)) {
    return;
  }

  const saved = getSavedPlaylists();
  delete saved[name];
  saveSavedPlaylists(saved);
  renderSavedPlaylists();
}

function renderSavedPlaylists() {
  const saved = getSavedPlaylists();
  const container = document.getElementById('savedPlaylistsContainer');
  const names = Object.keys(saved);

  if (!names.length) {
    container.innerHTML = '';
    return;
  }

  let html = '<div class="saved-playlists"><h3>保存済みプレイリスト</h3>';
  names.forEach(name => {
    const item = saved[name];
    const date = new Date(item.createdAt).toLocaleString('ja-JP');
    html += `
      <div class="saved-playlist-item">
        <div class="saved-playlist-name">
          <strong>${name}</strong> (${item.trackCount}曲)
          <br><small>${date}</small>
        </div>
        <div class="saved-playlist-actions">
          <button class="simple-btn" onclick="loadSavedPlaylist('${name.replace(/'/g, "\\'")}')">読込</button>
          <button class="simple-btn" onclick="deleteSavedPlaylist('${name.replace(/'/g, "\\'")}')">削除</button>
        </div>
      </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
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
  renderPlaylist();
};

function sharePlaylist() {
  if (!playlist.length) return alert("プレイリストが空です");

  const ids = playlist.map(track => track.id).join(',');
  
  const url = `${location.origin}/playlist.html?sd=${ids}`;
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
      const ids = shared.split(',');
      playlist = ids
        .map(id => {
          const numId = isNaN(id) ? id : Number(id);
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
  renderSavedPlaylists();
});

const loopToggle = document.getElementById('loopToggle');
if (loopToggle) {
  loopToggle.checked = isLoopAllEnabled;
  
  loopToggle.addEventListener('change', () => {
    isLoopAllEnabled = loopToggle.checked;
    localStorage.setItem('playlistLoopEnabled', isLoopAllEnabled);
  });
}

// --- サイト内プレイヤー（シークバー ＆ 前後スキップ）の制御 ---
(function() {
  const seekBar = document.getElementById('seek-bar');
  const currentTimeEl = document.getElementById('current-time');
  const durationEl = document.getElementById('duration');
  const nowPlayingEl = document.getElementById('now-playing');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  let isSeeking = false;

  function formatTime(sec) {
    if (isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  if (seekBar) {
    // メタデータ読み込み時に最大値を設定
    audio.addEventListener('loadedmetadata', () => {
      durationEl.textContent = formatTime(audio.duration);
      seekBar.max = audio.duration;
    });

    // 再生中にシークバーを更新
    audio.addEventListener('timeupdate', () => {
      if (!isSeeking) {
        seekBar.value = audio.currentTime;
        currentTimeEl.textContent = formatTime(audio.currentTime);
      }
    });

    // シークバーを操作中の処理
    seekBar.addEventListener('input', () => {
      isSeeking = true;
      currentTimeEl.textContent = formatTime(seekBar.value);
    });

    // 操作が終わったら再生位置を確定
    seekBar.addEventListener('change', () => {
      audio.currentTime = seekBar.value;
      isSeeking = false;
    });

    // 曲名表示の更新（再生開始時）
    audio.addEventListener('play', () => {
      if (playingIndex !== null && playlist[playingIndex]) {
        nowPlayingEl.textContent = "再生中: " + playlist[playingIndex].title;
      }
    });
  }

  // 「前の曲」ボタン
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (!playlist.length) return;
      // 曲が再生されていない場合は最後の曲へ、再生中の場合は前の曲へ
      if (playingIndex === null) playingIndex = playlist.length - 1;
      else playingIndex = (playingIndex - 1 + playlist.length) % playlist.length;
      
      // playlist.jsに定義されている既存の再生関数を呼び出す
      window.playPlaylistTrack(playingIndex); 
    });
  }

  // 「次の曲」ボタン
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (!playlist.length) return;
      // 曲が再生されていない場合は最初の曲へ、再生中の場合は次の曲へ
      if (playingIndex === null) playingIndex = 0;
      else playingIndex = (playingIndex + 1) % playlist.length;
      
      window.playPlaylistTrack(playingIndex); 
    });
  }
})();