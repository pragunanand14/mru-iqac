const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = (id) => document.getElementById(id);
let records = [];

function setMessage(text, type=''){ const el=$('message'); el.textContent=text; el.className='message '+type; }
function setLoginMessage(text, type=''){ const el=$('loginMessage'); el.textContent=text; el.className='message '+type; }
function esc(v){return String(v ?? '').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;', '"':'&quot;'}[ch]));}
function statusClass(s){return s.toLowerCase();}
function formatDate(d){return d?new Date(d+'T00:00:00').toLocaleDateString('en-GB'):'';}

async function init(){
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(session) showAdmin(); else showLogin();
  supabaseClient.auth.onAuthStateChange((_event, session)=> session ? showAdmin() : showLogin());
}
function showLogin(){ $('loginView').classList.remove('hidden'); $('adminView').classList.add('hidden'); $('logoutBtn').classList.add('hidden'); }
async function showAdmin(){ $('loginView').classList.add('hidden'); $('adminView').classList.remove('hidden'); $('logoutBtn').classList.remove('hidden'); await loadRecords(); }

$('loginForm').addEventListener('submit',async e=>{e.preventDefault();setLoginMessage('Signing in…');const {error}=await supabaseClient.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){setLoginMessage(error.message,'error');return}setLoginMessage('');});
$('logoutBtn').addEventListener('click',async()=>{await supabaseClient.auth.signOut();});
$('addBtn').addEventListener('click',()=>openModal());
$('closeModal').addEventListener('click',closeModal); $('cancelBtn').addEventListener('click',closeModal);
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal();});

async function loadRecords(){
  setMessage('Loading…');
  const {data,error}=await supabaseClient.from('worklog').select('id,date,task,status').order('date',{ascending:false});
  if(error){setMessage('Could not load Worklog: '+error.message,'error');return;}
  records=data||[]; render(); setMessage('');
}
function render(){
  const body=$('adminBody');
  if(!records.length){body.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:30px">No Worklog entries yet.</td></tr>';return;}
  body.innerHTML=records.map(r=>`<tr><td>${esc(formatDate(r.date))}</td><td>${esc(r.task)}</td><td><span class="status-pill ${esc(statusClass(r.status))}">${esc(r.status)}</span></td><td><button class="action-btn" data-edit="${r.id}">Edit</button><button class="action-btn delete" data-delete="${r.id}">Delete</button></td></tr>`).join('');
  body.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openModal(Number(b.dataset.edit)));
  body.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteRecord(Number(b.dataset.delete)));
}
function openModal(id=null){
  $('recordId').value=id||''; $('modalTitle').textContent=id?'Edit Worklog':'Add Worklog';
  if(id){const r=records.find(x=>x.id===id);$('workDate').value=r.date;$('workTask').value=r.task;$('workStatus').value=r.status;}
  else{$('worklogForm').reset();$('workStatus').value='Active';}
  $('modal').classList.remove('hidden'); $('workDate').focus();
}
function closeModal(){$('modal').classList.add('hidden');}
$('worklogForm').addEventListener('submit',async e=>{
  e.preventDefault(); const id=$('recordId').value; const payload={date:$('workDate').value,task:$('workTask').value.trim(),status:$('workStatus').value};
  const result=id ? await supabaseClient.from('worklog').update(payload).eq('id',id) : await supabaseClient.from('worklog').insert(payload);
  if(result.error){alert(result.error.message);return} closeModal(); await loadRecords();
});
async function deleteRecord(id){
  const r=records.find(x=>x.id===id); if(!r||!confirm(`Delete this Worklog entry?\n\n${r.task}`))return;
  const {error}=await supabaseClient.from('worklog').delete().eq('id',id); if(error){alert(error.message);return} await loadRecords();
}
init();
