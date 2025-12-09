
const db = firebase.database();
const target = 200000;

// UI refs
const usernameScreen = document.getElementById('username-screen');
const usernameInput = document.getElementById('username-input');
const btnUsernameContinue = document.getElementById('btn-username-continue');
const btnUsernameClear = document.getElementById('btn-username-clear');
const mainHeader = document.getElementById('main-header');
const mainNav = document.getElementById('main-nav');
const mainFooter = document.getElementById('main-footer');
const userBadge = document.getElementById('user-badge');

const dateInput = document.getElementById('date');
const dayInput = document.getElementById('day');
const profitInput = document.getElementById('profit');
const noteInput = document.getElementById('note');
const form = document.getElementById('profit-form');
const listDate = document.getElementById('list-date');
const listEl = document.getElementById('list');
const totalDayEl = document.getElementById('total-day');
const remainingEl = document.getElementById('remaining-day');
const filterYear = document.getElementById('filter-year');
const filterMonth = document.getElementById('filter-month');
const recapResult = document.getElementById('recap-result');
const navNotes = document.getElementById('nav-notes');
const navRecap = document.getElementById('nav-recap');
const pageNotes = document.getElementById('page-notes');
const pageRecap = document.getElementById('page-recap');
const btnLogout = document.getElementById('btn-logout');

// initial UI
document.getElementById('daily-target').innerText = new Intl.NumberFormat('id-ID').format(target);

// username handling
let username = localStorage.getItem('profit_username') || '';
function showUsernameScreen(show){
  usernameScreen.style.display = show ? 'block' : 'none';
  mainHeader.style.display = show ? 'none' : 'block';
  mainNav.style.display = show ? 'none' : 'flex';
  pageNotes.style.display = show ? 'none' : 'block';
  pageRecap.style.display = show ? 'none' : 'block';
  mainFooter.style.display = show ? 'none' : 'block';
}

function setUsername(u){
  username = u.trim();
  if(!username) return;
  localStorage.setItem('profit_username', username);
  userBadge.textContent = username;
  showUsernameScreen(false);
  // load default date list and allow interactions
  initAfterAuth();
}

btnUsernameContinue.addEventListener('click', ()=>{
  const u = usernameInput.value.trim();
  if(!u){alert('Masukkan username'); return;}
  // simple validation: only letters, numbers, underscore, hyphen, min 3 chars
  if(!/^[a-zA-Z0-9_-]{3,}$/.test(u)){alert('Username minimal 3 karakter; gunakan huruf, angka, - atau _');return;}
  setUsername(u.toLowerCase());
});

btnUsernameClear.addEventListener('click', ()=>{ usernameInput.value=''; localStorage.removeItem('profit_username'); username=''; showUsernameScreen(true); });

btnLogout.addEventListener('click', ()=>{
  if(!confirm('Ganti username? Anda akan keluar dari akun saat ini.')) return;
  localStorage.removeItem('profit_username');
  username='';
  showUsernameScreen(true);
});

// if already have username, skip screen
if(username){
  usernameInput.value = username;
  setTimeout(()=>{ setUsername(username); }, 300);
} else {
  showUsernameScreen(true);
}

// helpers
function formatIDR(n){ return new Intl.NumberFormat('id-ID').format(Number(n||0)); }
function getYMD(dateStr){ const d=new Date(dateStr); return {y:d.getFullYear(), m:String(d.getMonth()+1).padStart(2,'0'), d:String(d.getDate()).padStart(2,'0')} }
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  return weekNo;
}

// init UI after username set
function initAfterAuth(){
  userBadge.textContent = username;
  // show main UI
  showUsernameScreen(false);
  // set default dates
  const today = new Date().toISOString().slice(0,10);
  dateInput.value = today;
  listDate.value = today;

  // populate filter year/month
  const now = new Date();
  filterYear.innerHTML=''; filterMonth.innerHTML='';
  for(let y=now.getFullYear(); y>=now.getFullYear()-5; y--){ const opt=document.createElement('option'); opt.value=y; opt.textContent=y; filterYear.appendChild(opt); }
  for(let m=1;m<=12;m++){ const o=document.createElement('option'); o.value=String(m).padStart(2,'0'); o.textContent=m; filterMonth.appendChild(o); }
  filterYear.value = now.getFullYear();
  filterMonth.value = String(now.getMonth()+1).padStart(2,'0');

  // event listeners
  navNotes.addEventListener('click', ()=>{ switchPage('notes'); });
  navRecap.addEventListener('click', ()=>{ switchPage('recap'); });
  document.getElementById('clear-btn').addEventListener('click', ()=>form.reset());
  document.getElementById('refresh-list').addEventListener('click', ()=>loadList(listDate.value));
  listDate.addEventListener('change', ()=>loadList(listDate.value));
  // form submit
  form.addEventListener('submit', (e)=>{ e.preventDefault();
    const date = dateInput.value; const day = dayInput.value; const profit = Number(profitInput.value) || 0; const note = noteInput.value || '';
    if(!date || !day){ alert('Tanggal & hari wajib'); return; }
    if(['Sabtu','Minggu'].includes(day)){ alert('Hanya Senin–Jumat'); return; }
    const ymd = getYMD(date);
    const path = `profit/${encodeURIComponent(username)}/${ymd.y}/${ymd.m}/${ymd.d}`;
    const ref = db.ref(path);
    const payload = {date,day,profit,note,createdAt:Date.now()};
    ref.push(payload).then(()=>{ form.reset(); dateInput.value = date; loadList(date); }).catch(err=>alert('Gagal: '+err.message));
  });

  loadList(listDate.value);
}

// load list per user and date
function loadList(dateStr){
  if(!username){ return; }
  listEl.innerHTML = '<li style="color:var(--muted)">Memuat...</li>';
  const ymd = getYMD(dateStr);
  const path = `profit/${encodeURIComponent(username)}/${ymd.y}/${ymd.m}/${ymd.d}`;
  const ref = db.ref(path);
  ref.off();
  ref.on('value', snap=>{
    const val = snap.val();
    listEl.innerHTML = '';
    let total = 0;
    if(!val){ listEl.innerHTML = '<li style="color:var(--muted)">Belum ada data.</li>'; updateSummary(total); return; }
    Object.keys(val).reverse().forEach(k=>{
      const it = val[k];
      total += Number(it.profit||0);
      const li = document.createElement('li'); li.className='item';
      li.innerHTML = `<div class="left"><div>${it.day} • ${it.date}</div><div style="color:var(--muted);font-size:12px">${it.note||''}</div></div><div class="right">Rp ${formatIDR(it.profit)}</div>`;
      const btnDel = document.createElement('button'); btnDel.textContent='Hapus'; btnDel.className='btn-alt'; btnDel.style.marginLeft='8px';
      btnDel.addEventListener('click', ()=>{ if(confirm('Hapus entry?')) db.ref(path+'/'+k).remove(); });
      li.appendChild(btnDel);
      listEl.appendChild(li);
    });
    updateSummary(total);
  });
}

function updateSummary(total){
  totalDayEl.textContent = 'Rp '+formatIDR(total);
  remainingEl.textContent = 'Rp '+formatIDR(Math.max(0, target - total));
}

// RECAP functions scoped to username
async function fetchAllDataForUser(){
  if(!username) return {};
  const snap = await db.ref('profit/'+encodeURIComponent(username)).get();
  return snap.exists() ? snap.val() : {};
}

function flattenData(all){
  const out=[];
  Object.keys(all||{}).forEach(y=>{
    Object.keys(all[y]||{}).forEach(m=>{
      Object.keys(all[y][m]||{}).forEach(d=>{
        Object.keys(all[y][m][d]||{}).forEach(id=>{
          const it = all[y][m][d][id];
          out.push(Object.assign({}, it, {y: Number(y), m: Number(m), d: Number(d), week: getWeekNumber(new Date(it.date))}));
        });
      });
    });
  });
  return out;
}

document.getElementById('btn-monthly').addEventListener('click', async ()=>{
  recapResult.innerHTML='Memuat...';
  const all = flattenData(await fetchAllDataForUser());
  const map = {};
  all.forEach(it=>{
    const key = it.y+'-'+String(it.m).padStart(2,'0');
    map[key] = map[key] || {total:0, count:0};
    map[key].total += Number(it.profit||0); map[key].count++;
  });
  const rows = Object.keys(map).sort().reverse().map(k=>{
    const avg = Math.round(map[k].total / map[k].count || 0);
    return `<tr><td>${k}</td><td>Rp ${formatIDR(map[k].total)}</td><td>Rp ${formatIDR(avg)}</td></tr>`;
  }).join('');
  recapResult.innerHTML = `<table><thead><tr><th>Periode</th><th>Total</th><th>Rata-rata/hari</th></tr></thead><tbody>${rows}</tbody></table>`;
});

document.getElementById('btn-weekly').addEventListener('click', async ()=>{
  recapResult.innerHTML='Memuat...';
  const all = flattenData(await fetchAllDataForUser());
  const map={};
  all.forEach(it=>{
    const key = it.y+'-W'+String(it.week).padStart(2,'0');
    map[key] = map[key] || {total:0, count:0};
    map[key].total += Number(it.profit||0); map[key].count++;
  });
  const rows = Object.keys(map).sort().reverse().map(k=>{
    const avg = Math.round(map[k].total / map[k].count || 0);
    return `<tr><td>${k}</td><td>Rp ${formatIDR(map[k].total)}</td><td>Rp ${formatIDR(avg)}</td></tr>`;
  }).join('');
  recapResult.innerHTML = `<table><thead><tr><th>Minggu</th><th>Total</th><th>Rata-rata/hari</th></tr></thead><tbody>${rows}</tbody></table>`;
});

document.getElementById('btn-all').addEventListener('click', async ()=>{
  recapResult.innerHTML='Memuat...';
  const all = flattenData(await fetchAllDataForUser());
  const total = all.reduce((s,i)=>s+Number(i.profit||0),0);
  recapResult.innerHTML = `<div>Total semua: <strong>Rp ${formatIDR(total)}</strong> • Jumlah hari tercatat: ${all.length}</div>`;
});

function switchPage(p){ navNotes.classList.toggle('active', p==='notes'); navRecap.classList.toggle('active', p==='recap'); pageNotes.classList.toggle('active', p==='notes'); pageRecap.classList.toggle('active', p==='recap'); }
