let playlist = JSON.parse(localStorage.getItem('playlist') || '[]');
let audio = new Audio();
let playingIndex = null;

function renderPlaylist() {
  const tbody = document.getElementById('playlist-tbody');
  if (!playlist.length) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">プレイリストは空です。</td></tr>`;
    return;
  }
  tbody.innerHTML = '';
  playlist.forEach((track, i) => {
    tbody.innerHTML += `
      <tr>
        <td class="song-title">${track.title}</td>
        <td>
          <button class="simple-btn" onclick="playFromPlaylist(${i})">
            ${playingIndex === i && !audio.paused ? "⏸ 停止" : "▶ 再生"}
          </button>
        </td>
        <td>
          <button class="simple-btn" onclick="removeFromPlaylist(${i})">削除</button>
        </td>
      </tr>`;
  });
}

window.playFromPlaylist = function(i) {
  if (audio.src !== playlist[i].file) {
    audio.src = playlist[i].file;
    audio.play();
    playingIndex = i;
    renderPlaylist();
  } else {
    if (audio.paused) {
      audio.play();
      playingIndex = i;
    } else {
      audio.pause();
      playingIndex = i;
    }
    renderPlaylist();
  }
};

audio.addEventListener('ended', () => {
  if (playingIndex !== null && playingIndex + 1 < playlist.length) {
    playFromPlaylist(playingIndex + 1);
  } else {
    playingIndex = null;
    renderPlaylist();
  }
});

window.removeFromPlaylist = function(i) {
  playlist.splice(i, 1);
  localStorage.setItem('playlist', JSON.stringify(playlist));
  renderPlaylist();
};
window.clearPlaylist = function() {
  playlist = [];
  localStorage.removeItem('playlist');
  renderPlaylist();
};

renderPlaylist();