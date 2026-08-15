/*
 * UI templates are intentionally kept in these render functions. Replace the
 * markup here, or move these functions to a server-side template engine later.
 * The data layer below is the only part that needs to be replaced by an API.
 */
const STORAGE_KEY = "qr-ticket-demo-v1";
const seedTickets = [
  { id:"QRT-2026-0001", event:"夏の音楽フェスティバル", holder:"山田 太郎", date:"2026-08-22", type:"一般入場券", status:"valid", paid:true },
  { id:"QRT-2026-0002", event:"プロダクト展示会", holder:"佐藤 花子", date:"2026-09-05", type:"招待券", status:"used", paid:true },
  { id:"QRT-2026-0003", event:"秋のマーケット", holder:"鈴木 一郎", date:"2026-10-10", type:"一般入場券", status:"pending", paid:false }
];
function loadTickets() { const saved = localStorage.getItem(STORAGE_KEY); if (!saved) { localStorage.setItem(STORAGE_KEY, JSON.stringify(seedTickets)); return [...seedTickets]; } return JSON.parse(saved); }
function saveTickets(tickets) { localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets)); }
function formatDate(value) { return new Intl.DateTimeFormat("ja-JP", { dateStyle:"medium" }).format(new Date(`${value}T00:00:00`)); }
function statusLabel(status) { return { valid:"利用可能", used:"利用済み", pending:"支払い待ち" }[status] || status; }
function statusClass(status) { return `status status-${status}`; }
function qrCode() { return `<div class="qr" aria-label="QRコード（デモ）">${Array.from({length:225}, (_,i)=>`<i style="opacity:${((i*17+11)%23)>7 ? 1 : .12}"></i>`).join("")}</div><small class="muted">受付でこの画面を提示してください</small>`; }

function renderUser() {
  const tickets = loadTickets(); const ticket = tickets[0];
  document.querySelector("#app").innerHTML = `<section class="narrow"><div class="hero"><span class="eyebrow">My ticket</span><h1>チケットを確認</h1><p class="lead">イベント当日はこの画面のQRコードを受付で提示してください。</p></div><article class="card ticket-card"><div><span class="${statusClass(ticket.status)}">● ${statusLabel(ticket.status)}</span><h2>${ticket.event}</h2><div class="ticket-meta"><div><span class="meta-label">開催日</span><span class="meta-value">${formatDate(ticket.date)}</span></div><div><span class="meta-label">チケット種別</span><span class="meta-value">${ticket.type}</span></div><div><span class="meta-label">氏名</span><span class="meta-value">${ticket.holder}</span></div><div><span class="meta-label">チケットID</span><span class="meta-value">${ticket.id}</span></div></div><div class="actions"><button class="btn btn-secondary" id="reset-demo">デモデータをリセット</button></div></div><div class="qr-wrap">${qrCode()}</div></article><div class="notice">現在はブラウザ内のデモデータを表示しています。本番ではログインユーザーのチケットをAPIから取得し、決済完了後に発行します。</div></section>`;
  document.querySelector("#reset-demo").onclick = () => { localStorage.removeItem(STORAGE_KEY); renderUser(); };
}
function renderAdmin() {
  const tickets = loadTickets(); const valid = tickets.filter(t=>t.status === "valid").length; const used = tickets.filter(t=>t.status === "used").length;
  document.querySelector("#app").innerHTML = `<div class="dashboard-head"><div><span class="eyebrow">Console</span><h1>チケット管理</h1><p class="lead">発行済みチケットの状態を確認・更新できます。</p></div><button class="btn" id="create-ticket">テストチケットを発行</button></div><div class="stats"><div class="card"><span class="meta-label">総チケット数</span><div class="stat-number">${tickets.length}</div></div><div class="card"><span class="meta-label">利用可能</span><div class="stat-number">${valid}</div></div><div class="card"><span class="meta-label">利用済み</span><div class="stat-number">${used}</div></div></div><div class="toolbar"><input class="input" id="search" placeholder="イベント名・氏名・チケットIDで検索" /></div><div class="card table-card"><div class="table-scroll"><table><thead><tr><th>チケットID</th><th>イベント</th><th>購入者</th><th>開催日</th><th>状態</th><th>操作</th></tr></thead><tbody id="ticket-rows">${ticketRows(tickets)}</tbody></table></div></div><div class="notice">決済連携: 本番ではサーバー側でStripe Checkout Sessionを作成し、Webhookで支払い状態を確定してからチケットを発行します。</div>`;
  document.querySelector("#search").oninput = (e) => { const q=e.target.value.toLowerCase(); document.querySelector("#ticket-rows").innerHTML = ticketRows(tickets.filter(t=>Object.values(t).join(" ").toLowerCase().includes(q))); };
  document.querySelector("#create-ticket").onclick = () => { tickets.push({id:`QRT-2026-${String(tickets.length+1).padStart(4,"0")}`,event:"新規デモイベント",holder:"デモユーザー",date:"2026-12-01",type:"一般入場券",status:"valid",paid:true}); saveTickets(tickets); renderAdmin(); };
}
function ticketRows(tickets) { if (!tickets.length) return `<tr><td colspan="6" class="empty">該当するチケットがありません</td></tr>`; return tickets.map(t=>`<tr><td>${t.id}</td><td>${t.event}</td><td>${t.holder}</td><td>${formatDate(t.date)}</td><td><span class="${statusClass(t.status)}">${statusLabel(t.status)}</span></td><td>${t.status === "valid" ? `<button class="btn btn-danger mark-used" data-id="${t.id}">利用済みにする</button>` : "—"}</td></tr>`).join(""); }
document.addEventListener("click", e => { if (!e.target.matches(".mark-used")) return; const tickets=loadTickets().map(t=>t.id===e.target.dataset.id ? {...t,status:"used"} : t); saveTickets(tickets); renderAdmin(); });
if (document.body.dataset.page === "admin") renderAdmin(); else renderUser();
