const creatureTypes = ["寮傛€?,"閲庡吔","澶╃晫鐢熺墿","鏋勮浣?,"榫欑被","鍏冪礌","绮剧被","閭瓟","宸ㄤ汉","绫讳汉鐢熺墿","鎬墿","娉ユ€?,"妞嶇墿","涓嶆鐢熺墿"];
const alignments = ["瀹堝簭鍠勮壇","涓珛鍠勮壇","娣蜂贡鍠勮壇","瀹堝簭涓珛","缁濆涓珛","娣蜂贡涓珛","瀹堝簭閭伓","涓珛閭伓","娣蜂贡閭伓","鏃犻樀钀?];
const damageTypes = ["寮洪吀","鍐峰喕","鐏劙","鍔涘満","闂數","鏆楄殌","姣掔礌","蹇冪伒","鍏夎€€","闆烽福","鎸ョ爫","绌垮埡","閽濆嚮"];

let currentPage = 'dashboard';
let analysisData = null;

function switchPage(pageId) {
  currentPage = pageId;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');
  document.querySelectorAll('.sidebar-item').forEach(n => n.classList.remove('active'));
  const el = document.querySelector(`.sidebar-item[data-page="${pageId}"]`);
  if (el) el.classList.add('active');
}

// ----- 鏂囦欢鎷栨斁 -----
const dropZone = document.getElementById('dropZone');
if (dropZone) {
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.pdf')) {
      document.getElementById('fileInput').files = e.dataTransfer.files;
      document.getElementById('dropText').textContent = file.name;
    }
  });
}

function triggerFileInput() { document.getElementById('fileInput').click(); }
function handleFileInput(input) {
  if (input.files[0]) document.getElementById('dropText').textContent = input.files[0].name;
}

// ----- 鍒嗘瀽妯＄粍 -----
async function analyzeModule() {
  const resultDiv = document.getElementById('analysisResult');
  const detailDiv = document.getElementById('analysisDetail');
  resultDiv.innerHTML = '<div class="loading"><span class="spinner"></span>鍒嗘瀽涓?..</div>';
  detailDiv.style.display = 'none';

  try {
    let result;
    const fileInput = document.getElementById('fileInput');
    const textInput = document.getElementById('moduleText').value.trim();

    if (fileInput.files.length > 0) {
      const fd = new FormData();
      fd.append('file', fileInput.files[0]);
      result = await DNDAPI.analyzeModule(fd);
    } else if (textInput) {
      result = await apiRequest('/analyze', {
        method: 'POST',
        body: JSON.stringify({ text: textInput, name: '鎵嬪姩杈撳叆' })
      });
    } else {
      resultDiv.innerHTML = '<div class="alert alert-error">璇蜂笂浼燩DF鎴栫矘璐存枃鏈?/div>';
      return;
    }

    if (result.error) { resultDiv.innerHTML = '<div class="alert alert-error">' + result.error + '</div>'; return; }

    analysisData = result;
    resultDiv.innerHTML = '<div class="alert alert-success">鍒嗘瀽瀹屾垚锛佸叡 ' + result.char_count + ' 瀛楃</div>';
    detailDiv.style.display = 'block';

    showAnalysisTab('overview');
    document.getElementById('analysisOverview').innerHTML = `
      <div class="grid-2">
        <div><strong>璁惧畾锛?/strong>${result.setting || '鏈煡'}</div>
        <div><strong>绛夌骇锛?/strong>${result.level_range || '鏈煡'}</div>
        <div><strong>鏃堕暱锛?/strong>${result.estimated_playtime || '鏈煡'}</div>
        <div><strong>涓婚锛?/strong>${(result.themes||[]).map(t=>`<span class="tag tag-gold">${t}</span>`).join('')}</div>
      </div>
      <div class="mt-12"><strong>鎽樿锛?/strong><br>${result.summary || '鏃?}</div>
    `;
    document.getElementById('analysisLocations').innerHTML = (result.locations||[]).map(l => `<span class="tag tag-blue">${l}</span>`).join('') || '鏃?;
    document.getElementById('analysisFactions').innerHTML = (result.factions||[]).map(f => `<span class="tag tag-gold">${f}</span>`).join('') || '鏃?;
    document.getElementById('analysisNpcs').innerHTML = (result.npcs||[]).map(n => `<span class="tag tag-blue">${n}</span>`).join('') || '鏃?;
    document.getElementById('analysisMonsters').innerHTML = (result.monsters||[]).map(m => `<span class="tag tag-red">${m}</span>`).join('') || '鏃?;
    document.getElementById('analysisReport').innerHTML = '<pre class="md-content">' + escapeHtml(result.report_md) + '</pre>';

    // 娌夋蹈鎸囧崡
    if (result.immersion) {
      renderImmersion(result.immersion);
    }

    // 鑷姩濉厖鎬墿宸ュ潑
    if (result.monsters && result.monsters.length > 0) {
      const mainMonster = result.monsters[0];
      const locs = result.locations || [];
      document.getElementById('mEnv').value = locs.length > 0 ? locs[0] : '鍦颁笅娲炵┐';
    }
  } catch (e) {
    resultDiv.innerHTML = '<div class="alert alert-error">鍒嗘瀽澶辫触: ' + e.message + '</div>';
  }
}

function showAnalysisTab(tab) {
  const tabs = ['overview','locations','factions','npcs','monsters','immersion','report'];
  tabs.forEach(t => {
    const el = document.getElementById('analysis' + t.charAt(0).toUpperCase() + t.slice(1));
    if (el) el.classList.remove('active');
  });
  document.querySelectorAll('.analysis-tab').forEach(el => el.classList.remove('active'));
  const tabContent = document.getElementById('analysis' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if (tabContent) tabContent.classList.add('active');
  const tabEl = document.querySelector(`.analysis-tab[data-tab="${tab}"]`);
  if (tabEl) tabEl.classList.add('active');
}

function renderImmersion(imm) {
  const el = document.getElementById('analysisImmersion');
  if (!el) return;

  let html = '';

  // 涓栫晫瑙傚鍏?  html += '<div class="card" style="border-left:3px solid var(--accent-purple);"><div class="card-title">涓栫晫鑳屾櫙瀵煎叆</div>';
  html += '<div style="font-size:14px;line-height:1.8;font-style:italic;color:var(--text-primary);">"' + imm.world_intro + '"</div></div>';

  // 鏁呬簨鍩鸿皟
  html += '<div class="card"><div class="card-title">鏁呬簨鍩鸿皟</div>';
  html += '<div style="font-size:14px;line-height:1.8;">' + imm.atmosphere + '</div></div>';

  // 鍦扮偣姘涘洿
  if (imm.location_details && imm.location_details.length > 0) {
    html += '<div class="card"><div class="card-title">鍦扮偣姘涘洿鎻忚堪</div>';
    for (const loc of imm.location_details) {
      html += '<div class="card" style="margin-bottom:8px;padding:14px;">';
      html += '<div style="font-weight:bold;color:var(--accent-gold);margin-bottom:6px;">' + loc.name + '</div>';
      html += '<div style="font-size:13px;line-height:1.7;">';
      html += '<div><strong>姘涘洿锛?/strong>' + (loc.atmosphere || '鏈煡') + '</div>';
      html += '<div><strong>鍚锛?/strong><span style="color:var(--accent-blue);">' + (loc.sounds || '鏈煡') + '</span></div>';
      html += '<div><strong>闂诲埌锛?/strong><span style="color:var(--accent-green);">' + (loc.smells || '鏈煡') + '</span></div>';
      html += '<div><strong>鎻忚堪锛?/strong>' + (loc.description || '鏈煡') + '</div>';
      html += '</div></div>';
    }
    html += '</div>';
  }

  // 鐜╁瀵煎叆閽╁瓙
  html += '<div class="card"><div class="card-title">鐜╁瀵煎叆寤鸿</div><ul style="list-style:none;font-size:13px;line-height:2;">';
  for (const hook of (imm.player_hooks || [])) {
    html += '<li style="padding:6px 0;">&#9654; ' + hook + '</li>';
  }
  html += '</ul></div>';

  // Session 0
  html += '<div class="card"><div class="card-title">Session 0 寤鸿</div><ul style="list-style:none;font-size:13px;line-height:2;">';
  for (const tip of (imm.session_zero_advice || [])) {
    html += '<li style="padding:4px 0;">&#9672; ' + tip + '</li>';
  }
  html += '</ul></div>';

  // 闊充箰寤鸿
  if (imm.music_suggestions && imm.music_suggestions.length > 0) {
    html += '<div class="card"><div class="card-title">闊充箰姘涘洿寤鸿</div><ul style="list-style:none;font-size:13px;line-height:2;">';
    for (const m of imm.music_suggestions) {
      html += '<li style="padding:4px 0;">&#9835; ' + m + '</li>';
    }
    html += '</ul></div>';
  }

  // NPC瑙掕壊鎵紨
  if (imm.npc_roleplay_tips && imm.npc_roleplay_tips.length > 0) {
    html += '<div class="card"><div class="card-title">NPC瑙掕壊鎵紨鎸囧崡</div>';
    for (const n of imm.npc_roleplay_tips) {
      html += '<div class="card" style="margin-bottom:6px;padding:12px;border-left:3px solid var(--accent-blue);">';
      html += '<div style="font-weight:bold;color:var(--accent-blue);margin-bottom:4px;">' + n.name + '</div>';
      html += '<div style="font-size:13px;line-height:1.6;">' + (n.voiceTip || '') + '<br>' + (n.motivation || '') + '<br>' + (n.secret || '') + '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // DM鎻愮ず
  html += '<div class="card"><div class="card-title">DM鎻愮ず</div><ul style="list-style:none;font-size:13px;line-height:2;">';
  for (const tip of (imm.dm_tips || [])) {
    html += '<li style="padding:4px 0;">&#9889; ' + tip + '</li>';
  }
  html += '</ul></div>';

  el.innerHTML = html;
}

// ----- 鍒涘缓鎬墿 -----
async function createMonster() {
  const resultDiv = document.getElementById('monsterResult');
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = '<div class="loading"><span class="spinner"></span>鐢熸垚涓?..</div>';

  try {
    const data = {
      name: document.getElementById('mName').value || '鏃犲悕鎬墿',
      cr: parseInt(document.getElementById('mCr').value) || 1,
      size: document.getElementById('mSize').value,
      type: document.getElementById('mType').value,
      alignment: document.getElementById('mAlign').value,
      str: parseInt(document.getElementById('mStr').value) || 10,
      dex: parseInt(document.getElementById('mDex').value) || 10,
      con: parseInt(document.getElementById('mCon').value) || 10,
      int: parseInt(document.getElementById('mInt').value) || 10,
      wis: parseInt(document.getElementById('mWis').value) || 10,
      cha: parseInt(document.getElementById('mCha').value) || 10,
      resistances: document.getElementById('mResist').value.split(',').filter(Boolean),
      immunities: document.getElementById('mImmune').value.split(',').filter(Boolean),
      vulnerabilities: document.getElementById('mVuln').value.split(',').filter(Boolean),
      environment: document.getElementById('mEnv').value || '浠绘剰',
      organization: document.getElementById('mOrg').value || '鍗曠嫭鎴栧皬缇?,
    };

    const result = await DNDAPI.createMonster(data);
    if (result.status === 'ok') {
      resultDiv.innerHTML = '<div class="alert alert-success">鎬墿宸插垱寤猴紒</div>' + result.markdown;
      // Auto-fill validation
      const m = result.monster;
      document.getElementById('vName').value = m.name;
      document.getElementById('vCr').value = m.challenge_rating;
      document.getElementById('vAc').value = m.armor_class;
      document.getElementById('vHp').value = m.hit_points;
      document.getElementById('vAtt').value = (m.actions && m.actions[0]) ? m.actions[0].attack_bonus : 4;
      document.getElementById('vDpr').value = m.challenge_rating * 5 + 5;
      document.getElementById('vSpecial').checked = m.special_abilities && m.special_abilities.length > 0;
      document.getElementById('vLegendary').checked = m.legendary_actions && m.legendary_actions.length > 0;
    }
  } catch(e) {
    resultDiv.innerHTML = '<div class="alert alert-error">鍒涘缓澶辫触: ' + e.message + '</div>';
  }
}

// ----- 楠岃瘉鎬墿 -----
async function validateMonster() {
  const resultDiv = document.getElementById('validateResult');
  resultDiv.style.display = 'block';

  try {
    const data = {
      name: document.getElementById('vName').value,
      cr: parseFloat(document.getElementById('vCr').value),
      ac: parseInt(document.getElementById('vAc').value),
      hp: parseInt(document.getElementById('vHp').value),
      attack_bonus: parseInt(document.getElementById('vAtt').value),
      dpr: parseInt(document.getElementById('vDpr').value),
      save_dc: parseInt(document.getElementById('vDc').value) || 10,
      has_special: document.getElementById('vSpecial').checked,
      has_legendary: document.getElementById('vLegendary').checked,
      type: document.getElementById('vType').value,
    };

    const result = await DNDAPI.validateMonster(data);
    document.getElementById('uniquenessScore').textContent = result.uniqueness_score + '%';
    document.getElementById('uniquenessBar').style.width = result.uniqueness_score + '%';

    const s = document.getElementById('validateSummary');
    s.className = 'alert ' + (result.issues.length <= 2 ? 'alert-success' : 'alert-warning');
    s.textContent = result.summary;

    document.getElementById('strengthsList').innerHTML = result.strengths.map(i =>
      '<li style="color:var(--accent-green);">&#10004; ' + i + '</li>'
    ).join('') || '<li>鏃?/li>';

    const allItems = [...result.issues, ...result.suggestions];
    document.getElementById('issuesList').innerHTML = allItems.map(i =>
      '<li' + (result.issues.includes(i) ? ' style="color:var(--accent-red);"' : ' style="color:var(--accent-gold);"') + '>' + i + '</li>'
    ).join('') || '<li>鏃犻棶棰?/li>';
  } catch(e) {
    resultDiv.innerHTML = '<div class="alert alert-error">楠岃瘉澶辫触: ' + e.message + '</div>';
  }
}

// ----- 閬亣鏋勫缓 -----
async function buildEncounter() {
  try {
    const data = {
      level: parseInt(document.getElementById('eLevel').value) || 3,
      size: parseInt(document.getElementById('eSize').value) || 4,
      difficulty: document.getElementById('eDifficulty').value,
    };
    const result = await DNDAPI.buildEncounter(data);
    const enc = result.encounter;
    document.getElementById('encounterResult').style.display = 'block';
    document.getElementById('encounterResult').innerHTML = `
      <div class="card-title">閬亣寤鸿</div>
      <div class="grid-3">
        <div><strong>闃熶紞锛?/strong>${enc.party_size}鍚?{enc.party_level}绾?/div>
        <div><strong>闅惧害锛?/strong><span class="tag tag-gold">${enc.difficulty}</span></div>
        <div><strong>XP棰勭畻锛?/strong>${enc.xp_budget} XP</div>
      </div>
      <div class="mt-12"><strong>鏋勬垚锛?/strong>${enc.suggested_composition}</div>
      <div class="mt-12"><strong>鎴樻湳锛?/strong><ul>${enc.tips.map(t => '<li style="padding:3px 0;font-size:13px;">&#9654; ' + t + '</li>').join('')}</ul></div>
    `;
  } catch(e) {
    document.getElementById('encounterResult').style.display = 'block';
    document.getElementById('encounterResult').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
  }
}

// ----- 甯﹀洟鎸囧崡 -----
async function generateGuide() {
  const el = document.getElementById('guideResult');
  const err = document.getElementById('guideError');
  el.innerHTML = '<div class="loading"><span class="spinner"></span>鐢熸垚涓?..</div>';
  err.style.display = 'none';

  try {
    const result = await DNDAPI.generateGuide();
    if (result.error) { err.style.display = 'block'; err.textContent = result.error; el.innerHTML = ''; return; }
    let html = '';
    for (const [title, items] of Object.entries(result.sections)) {
      html += '<div class="card"><div class="card-title">' + title + '</div>';
      items.forEach(item => { html += '<div style="padding:4px 0;font-size:13px;">' + item + '</div>'; });
      html += '</div>';
    }
    el.innerHTML = html;
  } catch(e) { el.innerHTML = '<div class="alert alert-error">' + e.message + '</div>'; }
}

async function generateQuickRef() {
  const el = document.getElementById('quickRefResult');
  try {
    const result = await DNDAPI.quickRef();
    if (result.error) { document.getElementById('guideError').style.display = 'block';
      document.getElementById('guideError').textContent = result.error; return; }
    el.innerHTML = '<div class="card"><div class="card-title">&#9889; 蹇€熷弬鑰冨崱</div><pre class="md-content">' + escapeHtml(result.quick_ref) + '</pre></div>';
  } catch(e) { el.innerHTML = '<div class="alert alert-error">' + e.message + '</div>'; }
}

// ----- 鐭ヨ瘑搴?-----
async function loadRules() {
  try {
    const result = await DNDAPI.rules();
    const rules = result.rules;
    let html = '';
    for (const [section, items] of Object.entries(rules)) {
      if (typeof items === 'object' && !Array.isArray(items)) {
        html += '<div class="card"><div class="card-title">' + section.replace(/_/g,' ') + '</div>';
        for (const [k, v] of Object.entries(items)) {
          if (typeof v === 'object') {
            html += '<div class="mt-12"><strong>' + k + '锛?/strong></div>';
            for (const [k2, v2] of Object.entries(v)) html += '<div style="padding:2px 12px;font-size:13px;"><strong>' + k2 + '锛?/strong>' + v2 + '</div>';
          } else html += '<div style="padding:3px 0;font-size:13px;"><strong>' + k + '锛?/strong>' + v + '</div>';
        }
        html += '</div>';
      } else if (Array.isArray(items)) {
        html += '<div class="card"><div class="card-title">' + section.replace(/_/g,' ') + '</div><div class="tags">' +
          items.map(i => '<span class="tag tag-blue">' + i + '</span>').join('') + '</div></div>';
      }
    }
    document.getElementById('rulesContent').innerHTML = html;
  } catch(e) { document.getElementById('rulesContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>'; }
}

async function loadSetting() {
  try {
    const result = await DNDAPI.setting();
    const s = result.setting;
    let html = '<div class="card"><div class="card-title">涓栫晫</div><div>' + s.world_name + '</div></div>';
    html += '<div class="card"><div class="card-title">澶ч檰</div>';
    for (const [k,v] of Object.entries(s.continents)) html += '<div style="padding:3px 0;font-size:13px;"><strong>' + k + '锛?/strong>' + v + '</div>';
    html += '</div><div class="card"><div class="card-title">璐逛鸡鍖哄煙</div>';
    for (const [k,v] of Object.entries(s.faerun_regions)) html += '<div style="padding:3px 0;font-size:13px;"><strong>' + k + '锛?/strong>' + v + '</div>';
    html += '</div><div class="card"><div class="card-title">鍓戞咕鍩庡競</div><div class="tags">';
    for (const [k,v] of Object.entries(s.sword_coast_cities)) html += '<span class="tag tag-gold" title="' + v + '">' + k + '</span>';
    html += '</div></div><div class="card"><div class="card-title">绁炵郴</div>';
    html += '<div style="font-size:13px;"><strong>绁炰笂绁烇細</strong>' + s.pantheon.overdeity + '</div>';
    for (const [name, title] of s.pantheon.greater_deities) html += '<div style="font-size:13px;padding:2px 0;"><strong>' + name + '锛?/strong>' + title + '</div>';
    html += '</div>';
    document.getElementById('settingContent').innerHTML = html;
  } catch(e) { document.getElementById('settingContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>'; }
}

async function loadMonsterKb() {
  try {
    const result = await DNDAPI.monsterKnowledge();
    let html = '';
    html += '<div class="card"><div class="card-title">鏋勫缓姝ラ</div><ol style="font-size:13px;line-height:2;">';
    result.creation_steps.forEach(s => html += '<li>' + s + '</li>');
    html += '</ol></div><div class="card"><div class="card-title">2024 vs 2014 鍙樺寲</div>';
    for (const [k,v] of Object.entries(result.changes)) html += '<div style="padding:3px 0;font-size:13px;"><strong>' + k.replace(/_/g,' ') + '锛?/strong>' + v + '</div>';
    html += '</div><div class="card"><div class="card-title">鐢熷懡楠?/div><div class="tags">';
    for (const [k,v] of Object.entries(result.hit_dice)) html += '<span class="tag tag-blue">' + k + ' ' + v + '</span>';
    html += '</div></div><div class="card"><div class="card-title">鐗规€у簱</div>';
    for (const [cat, traits] of Object.entries(result.traits)) {
      html += '<div class="mt-12"><strong>' + cat + '</strong></div>';
      traits.forEach(t => html += '<div style="padding:2px 12px;font-size:13px;"><span class="tag tag-gold">' + t[0] + '</span> ' + t[1] + '</div>');
    }
    html += '</div><div class="card"><div class="card-title">CR琛?/div><div style="overflow-x:auto;"><table><tr style="background:var(--bg-input);">';
    html += '<th>CR</th><th>XP</th><th>PB</th><th>AC</th><th>HP</th><th>鏀诲嚮</th><th>DC</th><th>DPR</th></tr>';
    let count = 0;
    for (const [cr, d] of Object.entries(result.cr_table)) {
      if (count++ >= 25) break;
      html += `<tr><td>${cr}</td><td>${d.xp}</td><td>+${d.prof_bonus}</td><td>${d.ac}</td><td>${d.hp_range}</td><td>+${d.attack_bonus}</td><td>${d.dc_save}</td><td>${d.dpr_range}</td></tr>`;
    }
    html += '</table></div></div>';
    document.getElementById('monsterKbContent').innerHTML = html;
  } catch(e) { document.getElementById('monsterKbContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>'; }
}

function escapeHtml(t) {
  const d = document.createElement('div'); d.textContent = t; return d.innerHTML;
}

// ----- 鍒濆鍖?-----
document.addEventListener('DOMContentLoaded', async () => {
  // 鍔ㄦ€佺敓鎴愯〃鍗曢€夐」
  const crSelects = document.querySelectorAll('.cr-select');
  crSelects.forEach(sel => {
    for (let i = 0; i <= 30; i++) {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = i;
      sel.appendChild(opt);
    }
  });

  loadRules();
  loadSetting();
  loadMonsterKb();
});
