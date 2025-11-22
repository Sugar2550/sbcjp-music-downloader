function initMusicTable(options) {
  const {
    jsonUrl,        
    hasPlaylist,    
    tableContainerId 
  } = options;

  let songs = [];
  let audio = new Audio();
  let playingIndex = null;
  const trackList = document.getElementById(tableContainerId);
  const searchInput = document.getElementById('search');
  const loopToggle = document.getElementById('loopToggle');
  if (loopToggle) {
    const savedLoop = localStorage.getItem('loopEnabled') === 'true';
    loopToggle.checked = savedLoop;
    audio.loop = savedLoop;

    loopToggle.addEventListener('change', () => {
      audio.loop = loopToggle.checked;
      localStorage.setItem('loopEnabled', loopToggle.checked);
    });
  }


  fetch(jsonUrl)
    .then(res => res.json())
    .then(data => {
      songs = data;
      renderList(""); 
    })
    .catch(err => console.error('JSON読み込みエラー:', err));

  function renderList(filter = "") {
    let filteredSongs = songs.filter(track => track.title.toLowerCase().includes(filter.toLowerCase()));
    let html = `
      <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>曲名</th>
            <th>再生/停止</th>
            <th>ダウンロード</th>
            ${hasPlaylist ? '<th>プレイリストに追加</th>' : ''}
            <th>追加Ver.</th>
          </tr>
        </thead>
        <tbody>
    `;
    if (filteredSongs.length === 0) {
      html += `<tr><td colspan="${hasPlaylist ? 5 : 4}" style="text-align:center;">該当する曲がありません</td></tr>`;
    } else {
      filteredSongs.forEach((track, idx) => {
        const origIndex = songs.indexOf(track);
        let buttonIcon = (playingIndex === origIndex && !audio.paused)
          ? "⏸ 停止"
          : '<span style="font-size:18px; color:#111;">&#9654;</span> 再生';

        html += `<tr>
          <td class="song-title">${track.title}</td>
          <td><button class="simple-btn" data-index="${origIndex}">${buttonIcon}</button></td>
          <td><button class="simple-btn" onclick="downloadFile('${track.file}', '${track.title}')">⬇ ダウンロード</button></td>
          ${hasPlaylist ? `<td><button class="simple-btn" onclick="addToPlaylist(${origIndex})">＋追加</button></td>` : ''}
          <td>${track.version ? track.version : "-"}</td>
        </tr>`;
      });
    }
    html += `</tbody></table></div>`;
    trackList.innerHTML = html;

    trackList.querySelectorAll('.simple-btn[data-index]').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = Number(this.getAttribute('data-index'));
        togglePlay(idx);
      });
    });
  }

  function togglePlay(index) {
    audio.loop = loopToggle && loopToggle.checked;
    if (audio.src !== songs[index].file) {
      audio.src = songs[index].file;
      audio.play();
      playingIndex = index;
    } else {
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
      playingIndex = index;
    }
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: songs[index].title,
        artist: "",
        album: "",
        artwork: [
          {
            src: songs[index].artwork || "/images/default.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      });
      navigator.mediaSession.setActionHandler("play", () => audio.play());
      navigator.mediaSession.setActionHandler("pause", () => audio.pause());
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
    }
    renderList(searchInput.value);
  }

  window.addToPlaylist = function(index) {
    let playlist = JSON.parse(localStorage.getItem('playlist') || '[]');
    playlist.push(songs[index]);
    localStorage.setItem('playlist', JSON.stringify(playlist));
    alert("プレイリストに追加しました！");
  };

  audio.addEventListener('ended', () => {
    if (loopToggle && loopToggle.checked) {
      audio.currentTime = 0;
      audio.play();
    } else {
      playingIndex = null;
      renderList(searchInput.value);
    }
  });

  searchInput.addEventListener('input', e => renderList(e.target.value));
}
(function() {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");

  function applyTheme(e) {
    if (e.matches) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }

  applyTheme(prefersDark);

  prefersDark.addEventListener("change", applyTheme);
})();

function downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || url.split('/').pop();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
