const creatureTypes = ["异怪","野兽","天界生物","构装体","龙类","元素","精类","邪魔","巨人","类人生物","怪物","泥怪","植物","不死生物"];
const alignments = ["守序善良","中立善良","混乱善良","守序中立","绝对中立","混乱中立","守序邪恶","中立邪恶","混乱邪恶","无阵营"];
const damageTypes = ["强酸","冷冻","火焰","力场","闪电","暗蚀","毒素","心灵","光耀","雷鸣","挥砍","穿刺","钝击"];

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

// ----- 文件拖放 -----
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

// ----- 分析模组 -----
async function analyzeModule() {
  const resultDiv = document.getElementById('analysisResult');
  const detailDiv = document.getElementById('analysisDetail');
  resultDiv.innerHTML = '<div class="loading"><span class="spinner"></span>分析中...</div>';
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
        body: JSON.stringify({ text: textInput, name: '手动输入' })
      });
    } else {
      resultDiv.innerHTML = '<div class="alert alert-error">请上传PDF或粘贴文本</div>';
      return;
    }

    if (result.error) { resultDiv.innerHTML = '<div class="alert alert-error">' + result.error + '</div>'; return; }

    analysisData = result;
    resultDiv.innerHTML = '<div class="alert alert-success">分析完成！共 ' + result.char_count + ' 字符</div>';
    detailDiv.style.display = 'block';

    showAnalysisTab('overview');
    document.getElementById('analysisOverview').innerHTML = `
      <div class="grid-2">
        <div><strong>设定：</strong>${result.setting || '未知'}</div>
        <div><strong>等级：</strong>${result.level_range || '未知'}</div>
        <div><strong>时长：</strong>${result.estimated_playtime || '未知'}</div>
        <div><strong>主题：</strong>${(result.themes||[]).map(t=>`<span class="tag tag-gold">${t}</span>`).join('')}</div>
      </div>
      <div class="mt-12"><strong>摘要：</strong><br>${result.summary || '无'}</div>
    `;
    document.getElementById('analysisLocations').innerHTML = (result.locations||[]).map(l => `<span class="tag tag-blue">${l}</span>`).join('') || '无';
    document.getElementById('analysisFactions').innerHTML = (result.factions||[]).map(f => `<span class="tag tag-gold">${f}</span>`).join('') || '无';
    document.getElementById('analysisNpcs').innerHTML = (result.npcs||[]).map(n => `<span class="tag tag-blue">${n}</span>`).join('') || '无';
    document.getElementById('analysisMonsters').innerHTML = (result.monsters||[]).map(m => `<span class="tag tag-red">${m}</span>`).join('') || '无';
    document.getElementById('analysisReport').innerHTML = '<pre class="md-content">' + escapeHtml(result.report_md) + '</pre>';

    // 沉浸指南
    if (result.immersion) {
      renderImmersion(result.immersion);
    }

    // 自动填充怪物工坊
    if (result.monsters && result.monsters.length > 0) {
      const mainMonster = result.monsters[0];
      const locs = result.locations || [];
      document.getElementById('mEnv').value = locs.length > 0 ? locs[0] : '地下洞穴';
    }
  } catch (e) {
    resultDiv.innerHTML = '<div class="alert alert-error">分析失败: ' + e.message + '</div>';
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

  // 世界观导入
  html += '<div class="card" style="border-left:3px solid var(--accent-purple);"><div class="card-title">世界背景导入</div>';
  html += '<div style="font-size:14px;line-height:1.8;font-style:italic;color:var(--text-primary);">"' + imm.world_intro + '"</div></div>';

  // 故事基调
  html += '<div class="card"><div class="card-title">故事基调</div>';
  html += '<div style="font-size:14px;line-height:1.8;">' + imm.atmosphere + '</div></div>';

  // 地点氛围
  if (imm.location_details && imm.location_details.length > 0) {
    html += '<div class="card"><div class="card-title">地点氛围描述</div>';
    for (const loc of imm.location_details) {
      html += '<div class="card" style="margin-bottom:8px;padding:14px;">';
      html += '<div style="font-weight:bold;color:var(--accent-gold);margin-bottom:6px;">' + loc.name + '</div>';
      html += '<div style="font-size:13px;line-height:1.7;">';
      html += '<div><strong>氛围：</strong>' + (loc.atmosphere || '未知') + '</div>';
      html += '<div><strong>听见：</strong><span style="color:var(--accent-blue);">' + (loc.sounds || '未知') + '</span></div>';
      html += '<div><strong>闻到：</strong><span style="color:var(--accent-green);">' + (loc.smells || '未知') + '</span></div>';
      html += '<div><strong>描述：</strong>' + (loc.description || '未知') + '</div>';
      html += '</div></div>';
    }
    html += '</div>';
  }

  // 玩家导入钩子
  html += '<div class="card"><div class="card-title">玩家导入建议</div><ul style="list-style:none;font-size:13px;line-height:2;">';
  for (const hook of (imm.player_hooks || [])) {
    html += '<li style="padding:6px 0;">&#9654; ' + hook + '</li>';
  }
  html += '</ul></div>';

  // Session 0
  html += '<div class="card"><div class="card-title">Session 0 建议</div><ul style="list-style:none;font-size:13px;line-height:2;">';
  for (const tip of (imm.session_zero_advice || [])) {
    html += '<li style="padding:4px 0;">&#9672; ' + tip + '</li>';
  }
  html += '</ul></div>';

  // 音乐建议
  if (imm.music_suggestions && imm.music_suggestions.length > 0) {
    html += '<div class="card"><div class="card-title">音乐氛围建议</div><ul style="list-style:none;font-size:13px;line-height:2;">';
    for (const m of imm.music_suggestions) {
      html += '<li style="padding:4px 0;">&#9835; ' + m + '</li>';
    }
    html += '</ul></div>';
  }

  // NPC角色扮演
  if (imm.npc_roleplay_tips && imm.npc_roleplay_tips.length > 0) {
    html += '<div class="card"><div class="card-title">NPC角色扮演指南</div>';
    for (const n of imm.npc_roleplay_tips) {
      html += '<div class="card" style="margin-bottom:6px;padding:12px;border-left:3px solid var(--accent-blue);">';
      html += '<div style="font-weight:bold;color:var(--accent-blue);margin-bottom:4px;">' + n.name + '</div>';
      html += '<div style="font-size:13px;line-height:1.6;">' + (n.voiceTip || '') + '<br>' + (n.motivation || '') + '<br>' + (n.secret || '') + '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // DM提示
  html += '<div class="card"><div class="card-title">DM提示</div><ul style="list-style:none;font-size:13px;line-height:2;">';
  for (const tip of (imm.dm_tips || [])) {
    html += '<li style="padding:4px 0;">&#9889; ' + tip + '</li>';
  }
  html += '</ul></div>';

  el.innerHTML = html;
}

// ----- 创建怪物 -----
async function createMonster() {
  const resultDiv = document.getElementById('monsterResult');
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = '<div class="loading"><span class="spinner"></span>生成中...</div>';

  try {
    const data = {
      name: document.getElementById('mName').value || '无名怪物',
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
      environment: document.getElementById('mEnv').value || '任意',
      organization: document.getElementById('mOrg').value || '单独或小群',
    };

    const result = await DNDAPI.createMonster(data);
    if (result.status === 'ok') {
      resultDiv.innerHTML = '<div class="alert alert-success">怪物已创建！</div>' + result.markdown;
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
    resultDiv.innerHTML = '<div class="alert alert-error">创建失败: ' + e.message + '</div>';
  }
}

// ----- 验证怪物 -----
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
    ).join('') || '<li>无</li>';

    const allItems = [...result.issues, ...result.suggestions];
    document.getElementById('issuesList').innerHTML = allItems.map(i =>
      '<li' + (result.issues.includes(i) ? ' style="color:var(--accent-red);"' : ' style="color:var(--accent-gold);"') + '>' + i + '</li>'
    ).join('') || '<li>无问题</li>';
  } catch(e) {
    resultDiv.innerHTML = '<div class="alert alert-error">验证失败: ' + e.message + '</div>';
  }
}

// ----- 遭遇构建 -----
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
      <div class="card-title">遭遇建议</div>
      <div class="grid-3">
        <div><strong>队伍：</strong>${enc.party_size}名${enc.party_level}级</div>
        <div><strong>难度：</strong><span class="tag tag-gold">${enc.difficulty}</span></div>
        <div><strong>XP预算：</strong>${enc.xp_budget} XP</div>
      </div>
      <div class="mt-12"><strong>构成：</strong>${enc.suggested_composition}</div>
      <div class="mt-12"><strong>战术：</strong><ul>${enc.tips.map(t => '<li style="padding:3px 0;font-size:13px;">&#9654; ' + t + '</li>').join('')}</ul></div>
    `;
  } catch(e) {
    document.getElementById('encounterResult').style.display = 'block';
    document.getElementById('encounterResult').innerHTML = '<div class="alert alert-error">' + e.message + '</div>';
  }
}

// ----- 带团指南 -----
async function generateGuide() {
  const el = document.getElementById('guideResult');
  const err = document.getElementById('guideError');
  el.innerHTML = '<div class="loading"><span class="spinner"></span>生成中...</div>';
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
    el.innerHTML = '<div class="card"><div class="card-title">&#9889; 快速参考卡</div><pre class="md-content">' + escapeHtml(result.quick_ref) + '</pre></div>';
  } catch(e) { el.innerHTML = '<div class="alert alert-error">' + e.message + '</div>'; }
}

// ----- 知识库 -----
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
            html += '<div class="mt-12"><strong>' + k + '：</strong></div>';
            for (const [k2, v2] of Object.entries(v)) html += '<div style="padding:2px 12px;font-size:13px;"><strong>' + k2 + '：</strong>' + v2 + '</div>';
          } else html += '<div style="padding:3px 0;font-size:13px;"><strong>' + k + '：</strong>' + v + '</div>';
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
    let html = '<div class="card"><div class="card-title">世界</div><div>' + s.world_name + '</div></div>';
    html += '<div class="card"><div class="card-title">大陆</div>';
    for (const [k,v] of Object.entries(s.continents)) html += '<div style="padding:3px 0;font-size:13px;"><strong>' + k + '：</strong>' + v + '</div>';
    html += '</div><div class="card"><div class="card-title">费伦区域</div>';
    if (s.faerun_regions) for (const [k,v] of Object.entries(s.faerun_regions)) html += '<div style="padding:3px 0;font-size:13px;"><strong>' + k + '：</strong>' + v + '</div>';
    html += '</div><div class="card"><div class="card-title">剑湾城市</div><div class="tags">';
    for (const [k,v] of Object.entries(s.sword_coast_cities)) html += '<span class="tag tag-gold" title="' + v + '">' + k + '</span>';
    html += '</div></div><div class="card"><div class="card-title">神系</div>';
    html += '<div style="font-size:13px;"><strong>神上神：</strong>' + s.pantheon.overdeity + '</div>';
    for (const [name, title] of s.pantheon.greater_deities) html += '<div style="font-size:13px;padding:2px 0;"><strong>' + name + '：</strong>' + title + '</div>';
    html += '</div>';
    document.getElementById('settingContent').innerHTML = html;
  } catch(e) { document.getElementById('settingContent').innerHTML = '<div class="alert alert-error">' + e.message + '</div>'; }
}

async function loadMonsterKb() {
  try {
    const result = await DNDAPI.monsterKnowledge();
    let html = '';
    html += '<div class="card"><div class="card-title">构建步骤</div><ol style="font-size:13px;line-height:2;">';
    result.creation_steps.forEach(s => html += '<li>' + s + '</li>');
    html += '</ol></div><div class="card"><div class="card-title">2024 vs 2014 变化</div>';
    for (const [k,v] of Object.entries(result.changes)) html += '<div style="padding:3px 0;font-size:13px;"><strong>' + k.replace(/_/g,' ') + '：</strong>' + v + '</div>';
    html += '</div><div class="card"><div class="card-title">生命骰</div><div class="tags">';
    for (const [k,v] of Object.entries(result.hit_dice)) html += '<span class="tag tag-blue">' + k + ' ' + v + '</span>';
    html += '</div></div><div class="card"><div class="card-title">特性库</div>';
    for (const [cat, traits] of Object.entries(result.traits)) {
      html += '<div class="mt-12"><strong>' + cat + '</strong></div>';
      traits.forEach(t => html += '<div style="padding:2px 12px;font-size:13px;"><span class="tag tag-gold">' + t[0] + '</span> ' + t[1] + '</div>');
    }
    html += '</div><div class="card"><div class="card-title">CR表</div><div style="overflow-x:auto;"><table><tr style="background:var(--bg-input);">';
    html += '<th>CR</th><th>XP</th><th>PB</th><th>AC</th><th>HP</th><th>攻击</th><th>DC</th><th>DPR</th></tr>';
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

// ----- 初始化 -----
document.addEventListener('DOMContentLoaded', async () => {
  // 动态生成表单选项
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
