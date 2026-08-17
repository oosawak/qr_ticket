/* The browser has an explicit test mode. Production mode never issues tickets locally. */
const STORAGE_KEY = "qr-ticket-demo-v2";
const EVENTS_KEY = "qr-ticket-events-v1";
const MODE_KEY = "qr-ticket-operation-mode-v1";
const API_BASE = window.QR_TICKET_API_BASE || "";
const seedEvents = [
  { id:"event-001", name:"夏の音楽フェスティバル", venue:"東京ベイホール", date:"2026-08-22", price:6800, remaining:120, description:"一日を通して楽しめる音楽とフードのイベントです。" },
  { id:"event-002", name:"プロダクト展示会", venue:"幕張メッセ", date:"2026-09-05", price:2500, remaining:48, description:"新しいサービスやプロダクトに出会える展示会です。" },
  { id:"event-003", name:"秋のマーケット", venue:"代々木公園", date:"2026-10-10", price:1200, remaining:300, description:"地域のお店とクリエイターが集まるマーケットです。" }
];
const seedTickets = [
  { id:"QRT-2026-0001", eventId:"event-001", event:"夏の音楽フェスティバル", holder:"山田 太郎", date:"2026-08-22", type:"一般入場券", status:"valid", paid:true, purchasedAt:"2026-08-15" },
  { id:"QRT-2026-0002", eventId:"event-002", event:"プロダクト展示会", holder:"佐藤 花子", date:"2026-09-05", type:"招待券", status:"used", paid:true, purchasedAt:"2026-08-12" }
];

function loadTickets() { const saved = localStorage.getItem(STORAGE_KEY); if (!saved) { saveTickets(seedTickets); return [...seedTickets]; } return JSON.parse(saved); }
function saveTickets(tickets) { localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets)); }
function operationMode() { return localStorage.getItem(MODE_KEY) || "test"; }
function isProduction() { return operationMode() === "production"; }
function modeLabel() { return isProduction() ? "本番運用" : "テスト運用"; }
function loadEvents() { const saved = localStorage.getItem(EVENTS_KEY); if (!saved) { localStorage.setItem(EVENTS_KEY, JSON.stringify(seedEvents)); return [...seedEvents]; } return JSON.parse(saved); }
function yen(value) { return new Intl.NumberFormat("ja-JP", { style:"currency", currency:"JPY", maximumFractionDigits:0 }).format(value); }
function formatDate(value) { return new Intl.DateTimeFormat("ja-JP", { dateStyle:"medium" }).format(new Date(`${value}T00:00:00`)); }
function statusLabel(status) { return { valid:"利用可能", used:"利用済み", pending:"支払い待ち" }[status] || status; }
function statusClass(status) { return `status status-${status}`; }
function qrCode(id) { return `<canvas class="qr" data-ticket-id="${id}" aria-label="QRコード"></canvas><small class="muted qr-status">安全なQRを発行中...</small>`; }
async function renderQRCodes() {
  if (typeof QRCode === "undefined") return;
  for (const canvas of document.querySelectorAll("canvas[data-ticket-id]")) {
    const ticketId = canvas.dataset.ticketId;
    const status = canvas.nextElementSibling;
    try {
      let value;
      if (isProduction()) {
        const response = await fetch(`${API_BASE}/api/tickets/${encodeURIComponent(ticketId)}/qr`, { credentials:"include" });
        if (!response.ok) throw new Error(`QR API returned ${response.status}`);
        value = (await response.json()).token;
      } else {
        value = `TEST-ONLY:${ticketId}`;
      }
      await QRCode.toCanvas(canvas, value, { width:180, margin:1, errorCorrectionLevel:"M" });
      status.textContent = isProduction() ? "受付でこの画面を提示してください" : "テスト運用のQR（本番受付では無効）";
    } catch (error) {
      console.error(error);
      canvas.replaceWith(Object.assign(document.createElement("div"), { className:"qr qr-unavailable", textContent:"バックエンド接続後に表示" }));
      status.textContent = "安全なQRを発行できません。通信状態を確認してください。";
    }
  }
}
function userNav(active) { return `<nav class="user-nav"><a class="${active === "events" ? "active" : ""}" href="index.html?view=events">イベントを探す</a><a class="${active === "tickets" ? "active" : ""}" href="index.html?view=tickets">購入済みチケット</a></nav>`; }

function renderUser() { const view = new URLSearchParams(location.search).get("view") || "events"; if (view === "tickets") renderUserTickets(); else renderEvents(); }
function renderEvents() {
  const events = loadEvents();
  document.querySelector("#app").innerHTML = `<section><div class="hero"><span class="eyebrow">Find an event</span><h1>参加したいイベントを探す</h1><p class="lead">イベントを選んで購入すると、決済確認後にデジタルチケットが発行されます。</p></div>${userNav("events")}<div class="toolbar event-search"><input class="input" id="event-search" placeholder="イベント名・会場で検索" /></div><div class="event-grid" id="event-grid">${eventCards(events)}</div><div class="notice">運用モード: ${modeLabel()}。${isProduction() ? "決済とチケット発行にはバックエンド接続が必要です。" : "テストデータはこのブラウザ内だけで動作し、本番受付では利用できません。"}</div></section>`;
  document.querySelector("#event-search").oninput = (e) => { const q=e.target.value.toLowerCase(); document.querySelector("#event-grid").innerHTML = eventCards(events.filter(event => `${event.name} ${event.venue}`.toLowerCase().includes(q))); document.querySelectorAll(".buy-event").forEach(button => button.onclick = () => openPurchase(button.dataset.eventId)); };
  document.querySelectorAll(".buy-event").forEach(button => button.onclick = () => openPurchase(button.dataset.eventId));
}
function eventCards(events) {
  if (!events.length) return `<div class="card empty">条件に一致するイベントがありません</div>`;
  return events.map(event => `<article class="card event-card"><div class="event-card-top"><span class="eyebrow">Event</span><span class="remaining">残り${event.remaining}枚</span></div><h2>${event.name}</h2><p class="event-description">${event.description}</p><div class="event-meta"><span>📅 ${formatDate(event.date)}</span><span>📍 ${event.venue}</span></div><div class="event-card-bottom"><strong>${yen(event.price)}<small> / 1枚</small></strong><button class="btn buy-event" data-event-id="${event.id}">購入する</button></div></article>`).join("");
}
function openPurchase(eventId) {
  const event = loadEvents().find(item => item.id === eventId); if (!event) return;
  const modal = document.createElement("div"); modal.className = "modal-backdrop"; modal.innerHTML = `<div class="modal card"><button class="modal-close" aria-label="閉じる">×</button><span class="eyebrow">${isProduction() ? "Checkout" : "Test checkout"}</span><h2>${event.name}</h2><p>${formatDate(event.date)} / ${event.venue}</p><div class="checkout-summary"><span>一般入場券</span><strong>${yen(event.price)}</strong></div><label class="field-label">購入者名<input class="input" id="buyer-name" value="山田 太郎" /></label><button class="btn full" id="confirm-purchase">${isProduction() ? "決済へ進む" : "テストチケットを発行"}</button><small class="muted">${isProduction() ? "Stripe Checkoutで支払いが確定した後に発行されます。" : "テスト運用では決済を行わず、このブラウザにテストチケットを保存します。"}</small></div>`;
  document.body.appendChild(modal); modal.querySelector(".modal-close").onclick = () => modal.remove(); modal.onclick = e => { if (e.target === modal) modal.remove(); };
  modal.querySelector("#confirm-purchase").onclick = async () => {
    const holder = modal.querySelector("#buyer-name").value.trim() || "ゲストユーザー";
    if (!isProduction()) {
      const tickets=loadTickets(); const ticket={id:`QRT-${new Date().getFullYear()}-${String(tickets.length+1).padStart(4,"0")}`,eventId:event.id,event:event.name,holder,date:event.date,type:"一般入場券",status:"valid",paid:false,purchasedAt:new Date().toISOString().slice(0,10)};
      saveTickets([...tickets,ticket]); modal.remove(); location.href=`index.html?view=tickets&issued=${encodeURIComponent(ticket.id)}`; return;
    }
    const button = modal.querySelector("#confirm-purchase"); button.disabled = true; button.textContent = "接続中...";
    try {
      const response = await fetch(`${API_BASE}/api/payment/checkout`, { method:"POST", headers:{"content-type":"application/json"}, credentials:"include", body:JSON.stringify({ eventId:event.id, holder }) });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.message || result.error || "決済サーバーに接続できません");
      location.href = result.url;
    } catch (error) { button.disabled = false; button.textContent = "決済へ進む"; alert(error.message); }
  };
}
function renderUserTickets() {
  const tickets = loadTickets(); const issued = new URLSearchParams(location.search).get("issued");
  document.querySelector("#app").innerHTML = `<section><div class="hero"><span class="eyebrow">My tickets</span><h1>購入済みチケット</h1><p class="lead">購入したチケットをいつでも確認できます。</p></div>${userNav("tickets")}${issued ? `<div class="success">チケットを発行しました。受付ではQRコードを提示してください。</div>` : ""}<div class="ticket-list">${tickets.map(ticketCard).join("")}</div><div class="notice">チケットは現在このブラウザ内に保存されています。ログインとAPI接続後は、どの端末からでも確認できるようになります。</div></section>`;
  renderQRCodes();
}
function ticketCard(ticket) { return `<article class="card ticket-card"><div><span class="${statusClass(ticket.status)}">● ${statusLabel(ticket.status)}</span><h2>${ticket.event}</h2><div class="ticket-meta"><div><span class="meta-label">開催日</span><span class="meta-value">${formatDate(ticket.date)}</span></div><div><span class="meta-label">チケット種別</span><span class="meta-value">${ticket.type}</span></div><div><span class="meta-label">氏名</span><span class="meta-value">${ticket.holder}</span></div><div><span class="meta-label">チケットID</span><span class="meta-value">${ticket.id}</span></div></div></div><div class="qr-wrap">${qrCode(ticket.id)}</div></article>`; }

async function renderAdmin() {
  let tickets;
  if (isProduction()) {
    try { const response = await fetch(`${API_BASE}/api/tickets`, { credentials:"include" }); tickets = response.ok ? await response.json() : []; }
    catch (error) { console.error(error); tickets = []; }
  } else tickets = loadTickets();
  const valid=tickets.filter(t=>t.status === "valid").length; const used=tickets.filter(t=>t.status === "used").length;
  document.querySelector("#app").innerHTML = `<div class="dashboard-head"><div><span class="eyebrow">Console</span><h1>チケット管理</h1><p class="lead">発行済みチケットの状態を確認・更新できます。</p></div><div class="actions"><label class="field-label mode-select">運用モード<select class="input" id="operation-mode"><option value="test" ${!isProduction()?"selected":""}>テスト運用（サーバー不要）</option><option value="production" ${isProduction()?"selected":""}>本番運用（API必須）</option></select></label><button class="btn" id="create-ticket">${isProduction() ? "本番ではサーバーから発行" : "テストチケットを発行"}</button></div></div><div class="stats"><div class="card"><span class="meta-label">総チケット数</span><div class="stat-number">${tickets.length}</div></div><div class="card"><span class="meta-label">利用可能</span><div class="stat-number">${valid}</div></div><div class="card"><span class="meta-label">利用済み</span><div class="stat-number">${used}</div></div></div><div class="toolbar"><input class="input" id="search" placeholder="イベント名・氏名・チケットIDで検索" /></div><div class="card table-card"><div class="table-scroll"><table><thead><tr><th>チケットID</th><th>イベント</th><th>購入者</th><th>開催日</th><th>状態</th><th>操作</th></tr></thead><tbody id="ticket-rows">${ticketRows(tickets)}</tbody></table></div></div><div class="notice">${isProduction() ? "本番運用: 決済、チケット発行、利用済み更新は認証済みバックエンドで実行します。" : "テスト運用: このブラウザのローカルデータだけで動作します。本番受付では使用できません。"}</div>`;
  document.querySelector("#search").oninput=e=>{const q=e.target.value.toLowerCase();document.querySelector("#ticket-rows").innerHTML=ticketRows(tickets.filter(t=>Object.values(t).join(" ").toLowerCase().includes(q)));};
  document.querySelector("#operation-mode").onchange=(e)=>{localStorage.setItem(MODE_KEY,e.target.value);renderAdmin();};
  document.querySelector("#create-ticket").onclick=()=>{if(isProduction()){alert("本番チケットは決済Webhookまたは認証済みAPIから発行してください。");return;} tickets.push({id:`QRT-2026-${String(tickets.length+1).padStart(4,"0")}`,event:"テストイベント",holder:"テストユーザー",date:"2026-12-01",type:"一般入場券",status:"valid",paid:false});saveTickets(tickets);renderAdmin();};
}
function ticketRows(tickets) { if(!tickets.length)return `<tr><td colspan="6" class="empty">該当するチケットがありません</td></tr>`; return tickets.map(t=>`<tr><td>${t.id}</td><td>${t.event}</td><td>${t.holder}</td><td>${formatDate(t.date)}</td><td><span class="${statusClass(t.status)}">${statusLabel(t.status)}</span></td><td>${t.status === "valid" ? `<button class="btn btn-danger mark-used" data-id="${t.id}">利用済みにする</button>` : "—"}</td></tr>`).join(""); }
document.addEventListener("click",async e=>{if(!e.target.matches(".mark-used"))return; if(isProduction()){try{const response=await fetch(`${API_BASE}/api/tickets/${encodeURIComponent(e.target.dataset.id)}/use`,{method:"POST",credentials:"include"});if(!response.ok)throw new Error("利用済み更新に失敗しました");renderAdmin();}catch(error){alert(error.message);}}else{saveTickets(loadTickets().map(t=>t.id===e.target.dataset.id?{...t,status:"used"}:t));renderAdmin();}});
if(document.body.dataset.page === "admin") renderAdmin(); else renderUser();
