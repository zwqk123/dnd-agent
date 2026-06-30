export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API路由
    if (path.startsWith('/api/dnd/')) {
      const apiPath = path.slice(9);
      return handleAPI(apiPath, request);
    }

    // 静态资源由Pages处理
    return env.ASSETS.fetch(request);
  }
};

// ========== 知识库数据 ==========
const CR_TABLE = {
  "0":{xp:10,pb:2,ac:13,hp:"1-6",atk:3,dc:10,dpr:"0-1"},
  "1/8":{xp:25,pb:2,ac:13,hp:"7-35",atk:3,dc:10,dpr:"2-3"},
  "1/4":{xp:50,pb:2,ac:13,hp:"36-49",atk:3,dc:10,dpr:"4-5"},
  "1/2":{xp:100,pb:2,ac:13,hp:"50-70",atk:3,dc:10,dpr:"6-8"},
  "1":{xp:200,pb:2,ac:13,hp:"71-85",atk:3,dc:10,dpr:"9-14"},
  "2":{xp:450,pb:2,ac:13,hp:"86-100",atk:3,dc:10,dpr:"15-20"},
  "3":{xp:700,pb:2,ac:13,hp:"101-115",atk:4,dc:10,dpr:"21-26"},
  "4":{xp:1100,pb:2,ac:14,hp:"116-130",atk:5,dc:10,dpr:"27-32"},
  "5":{xp:1800,pb:3,ac:15,hp:"131-145",atk:6,dc:11,dpr:"33-38"},
  "6":{xp:2300,pb:3,ac:15,hp:"146-160",atk:6,dc:11,dpr:"39-44"},
  "7":{xp:2900,pb:3,ac:15,hp:"161-175",atk:6,dc:11,dpr:"45-50"},
  "8":{xp:3900,pb:3,ac:16,hp:"176-190",atk:7,dc:12,dpr:"51-56"},
  "9":{xp:5000,pb:4,ac:16,hp:"191-205",atk:7,dc:12,dpr:"57-62"},
  "10":{xp:5900,pb:4,ac:17,hp:"206-220",atk:7,dc:12,dpr:"63-68"},
  "11":{xp:7200,pb:4,ac:17,hp:"221-235",atk:8,dc:13,dpr:"69-74"},
  "12":{xp:8400,pb:4,ac:17,hp:"236-250",atk:8,dc:13,dpr:"75-80"},
  "13":{xp:10000,pb:5,ac:18,hp:"251-265",atk:8,dc:13,dpr:"81-86"},
  "14":{xp:11500,pb:5,ac:18,hp:"266-280",atk:8,dc:13,dpr:"87-92"},
  "15":{xp:13000,pb:5,ac:18,hp:"281-295",atk:9,dc:14,dpr:"93-98"},
  "16":{xp:15000,pb:5,ac:18,hp:"296-310",atk:9,dc:14,dpr:"99-104"},
  "17":{xp:18000,pb:6,ac:19,hp:"311-325",atk:10,dc:15,dpr:"105-110"},
  "18":{xp:20000,pb:6,ac:19,hp:"326-340",atk:10,dc:15,dpr:"111-116"},
  "19":{xp:22000,pb:6,ac:19,hp:"341-355",atk:10,dc:15,dpr:"117-122"},
  "20":{xp:25000,pb:6,ac:19,hp:"356-400",atk:10,dc:15,dpr:"123-140"},
  "21":{xp:33000,pb:7,ac:20,hp:"401-445",atk:11,dc:16,dpr:"141-158"},
  "22":{xp:41000,pb:7,ac:20,hp:"446-490",atk:11,dc:16,dpr:"159-176"},
  "23":{xp:50000,pb:7,ac:20,hp:"491-535",atk:11,dc:16,dpr:"177-194"},
  "24":{xp:62000,pb:7,ac:20,hp:"536-580",atk:12,dc:17,dpr:"195-212"},
  "25":{xp:75000,pb:8,ac:21,hp:"581-625",atk:12,dc:17,dpr:"213-230"},
  "26":{xp:90000,pb:8,ac:21,hp:"626-670",atk:12,dc:17,dpr:"231-248"},
  "27":{xp:105000,pb:8,ac:22,hp:"671-715",atk:13,dc:18,dpr:"249-266"},
  "28":{xp:120000,pb:8,ac:22,hp:"716-760",atk:13,dc:18,dpr:"267-284"},
  "29":{xp:135000,pb:9,ac:22,hp:"761-805",atk:13,dc:18,dpr:"285-302"},
  "30":{xp:155000,pb:9,ac:23,hp:"806-850",atk:14,dc:19,dpr:"303-320"},
};
const HD = {微型:"d4",小型:"d6",中型:"d8",大型:"d10",巨型:"d12",超巨型:"d20"};
const RULES = {
  core_mechanics:{
    d20_test:"所有检定基于d20投骰+属性调整值+熟练加值",
    advantage_disadvantage:"优势掷两次取高，劣势掷两次取低",
    proficiency_bonus:"1-4级+2，5-8级+3，9-12级+4，13-16级+5，17-20级+6",
    six_abilities:"力量/敏捷/体质/智力/感知/魅力",
    skill_list:"运动/特技/巧手/隐匿/奥秘/历史/调查/自然/宗教/驯兽/洞察/医药/察觉/生存/威吓/表演/游说/欺骗",
    action_types:"动作/附赠动作/反应/自由动作",
  },
  combat:{
    initiative:"先攻=敏捷检定",surprise:"被突袭者先攻劣势",
    cover:"半掩护AC+2，四分之三掩护AC+5",
    attack_roll:"攻击检定=d20+属性调整值+熟练加值",
    critical_hit:"重击时伤害骰投两次加调整值",
  },
  damage_types:["强酸","冷冻","火焰","力场","闪电","暗蚀","毒素","心灵","光耀","雷鸣","挥砍","穿刺","钝击"],
  conditions:["魅惑","晕眩","耳聋","力竭","恐慌","擒抱","失能","隐形","麻痹","石化","中毒","倒地","压制","束缚","震慑","昏迷","减速"],
};
const REALMS = {
  world_name:"艾伯尔-托瑞尔(Abeir-Toril)，简称托瑞尔",
  continents:{faerun:"费伦-主要舞台",kara_tur:"卡拉图-东方风格",maztica:"马兹特克-阿兹特克风格",zakhara:"札哈拉-阿拉伯风格"},
  sword_coast_cities:{neverwinter:"绝冬城",waterdeep:"深水城",baldurs_gate:"博德之门",phandalin:"梵杜尔"},
  pantheon:{overdeity:"艾欧(Ao)-神上神",greater_deities:[["阿祖斯","法师之神"],["班恩","暴政之神"],["查提","农业女神"],["密斯特拉","魔法女神"],["提尔","正义之神"]]},
};
const STEPS = ["1.确定概念","2.选择体型","3.设定CR","4.分配属性","5.计算HP","6.确定AC","7.确定攻击加值","8.计算伤害","9.添加特性","10.细化描述"];
const CHANGES = {hp_formula:"2024:HP=9+18xCR",dpr_ratio:"2024:伤害/HP比约0.4",legendary_actions:"传奇动作计入DPR"};
const TRAITS = {
  defensive:[["魔法抗性","豁免优势"],["传奇抗性(3/日)","失败变成功"],["再生","回合初回HP"]],
  offensive:[["多重攻击","多次攻击"],["吐息武器(充能5-6)","范围伤害"]],
  mobility:[["飞行","飞行速度"],["钻地","钻地速度"]],
  senses:[["黑暗视觉","黑暗中视物"],["真实视觉","看穿隐形"]],
};
const MONSTER_STEPS = ["1.确定概念","2.选择体型","3.设定CR","4.分配属性","5.计算HP","6.确定AC","7.确定攻击加值","8.计算伤害","9.添加特性","10.细化描述"];

// ========== 响应工具 ==========
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' },
  });
}
function err(msg, s = 400) { return json({ error: msg }, s); }

// ========== 模组分析 ==========
let analysis = null;
function analyze(text, name) {
  const d = {
    name: name || "未知模组",
    summary: (()=>{const l=text.split('\n');for(let i=0;i<l.length;i++)for(const k of["背景","简介","概述"])if(l[i].includes(k)&&l[i].length<50)return l.slice(i,i+10).join('\n').slice(0,500);return "（未提取到摘要）"})(),
    level_range: (()=>{const m=text.match(/(\d+)[-~至到](\d+)\s*级/);if(m)return `第${m[1]}级至第${m[2]}级`;const m2=text.match(/(\d+)\s*级/);return m2?`第${m2[1]}级`:"（未知）"})(),
    setting: (()=>{const k={"费伦":"被遗忘的国度-费伦","剑湾":"被遗忘的国度-剑湾","深水城":"被遗忘的国度-深水城"};const r=[];for(const[kw,v]of Object.entries(k))if(text.includes(kw))r.push(v);return r.join("、")||"（未确定）"})(),
    factions: (()=>{const k={"散塔林":"散塔林会(Zhentarim)","竖琴手":"竖琴手(Harpers)","拜龙教":"拜龙教(Cult of the Dragon)"};const r=[];for(const[kw,v]of Object.entries(k))if(text.includes(kw))r.push(v);return r.length?r:["（未检测到）"]})(),
    npcs: (()=>{const p=text.match(/([\u4e00-\u9fff]{2,4}(?:法师|战士|商人|领主|祭司|盗贼))/g);return p?[...new Set(p)].slice(0,15):["（建议手动识别）"]})(),
    monsters: (()=>{const k=["地精","熊地精","大地精","狗头人","食人魔","巨魔","狼","骷髅","僵尸","龙"];const r=[];for(const m of k){if(text.includes(m)){const c=(text.match(new RegExp(m,'g'))||[]).length;r.push(`${m}(${c}次)`);}}return r.length?r.slice(0,20):["（未检测到）"]})(),
    locations: (()=>{const lk=["矿坑","洞穴","塔楼","城堡","神庙","森林","沼泽","城市","村庄"];const s=new Set();for(const k of lk){const p=new RegExp(`([\\u4e00-\\u9fff]{1,8}${k})`,'g');const m=text.match(p);if(m)m.forEach(x=>s.add(x));}return s.size?[...s].slice(0,10):["（未提取到）"]})(),
    treasure: (()=>{const k=["魔法","武器","护甲","戒指","项链","药水","卷轴","法杖","宝石","金币"];return k.filter(kw=>text.includes(kw))||["（未检测到）"]})(),
    plot_nodes: (()=>{const k=["阴谋","计划","秘密","线索","陷阱","背叛","联盟"];return k.filter(kw=>text.includes(kw))||["（未检测到）"]})(),
    estimated_playtime: text.length>500000?"40+小时":text.length>200000?"16-40小时":text.length>50000?"4-16小时":"1-4小时",
    themes: (()=>{const t=[["探索","探索"],["战斗","战斗"],["谜题","谜题"],["社交","社交"],["地城","地城探险"]];return[...new Set(t.filter(([k])=>text.includes(k)).map(([,v])=>v))].slice(0,5)||["综合冒险"]})(),
  };
  analysis = d;
  return d;
}

function reportMd(d) {
  return [`# 模组分析报告：${d.name}`,"","## 基本信息",`- 设定：${d.setting}`,`- 等级：${d.level_range}`,`- 时长：${d.estimated_playtime}`,`- 主题：${d.themes.join('、')}`,"","## 摘要",d.summary,"","## 关键地点",...d.locations.map(l=>`- ${l}`),"","## NPC与势力",...d.factions.map(f=>`- 势力：${f}`),...d.npcs.map(n=>`- NPC：${n}`),"","## 怪物",...d.monsters.map(m=>`- ${m}`),"","## 宝藏",...d.treasure.map(t=>`- ${t}`),"","## 剧情元素",...d.plot_nodes.map(p=>`- ${p}`)].join('\n');
}

// ========== 怪物创建 ==========
function designMonster(d) {
  const ab = { 力量:parseInt(d.str)||10,敏捷:parseInt(d.dex)||10,体质:parseInt(d.con)||10,
               智力:parseInt(d.int)||10,感知:parseInt(d.wis)||10,魅力:parseInt(d.cha)||10 };
  const cr = parseInt(d.cr)||1;
  const crKey = String(cr);
  const crd = CR_TABLE[crKey]||{pb:2,ac:13,atk:3,dc:10,xp:200};
  const conMod = Math.floor((ab.体质-10)/2);
  const hdType = HD[d.size]||"d8";
  const hdSize = parseInt(hdType.substring(1));
  const hdAvg = (hdSize+1)/2;
  const hpTarget = Math.floor(71+85)/2;
  const hdNum = Math.max(1,Math.round(hpTarget/(hdAvg+conMod)));
  const hp = Math.round(hdNum*(hdAvg+conMod));
  const ac = crd.ac+Math.floor(Math.random()*3)-1;
  const pb = crd.pb;
  const sm = Math.floor((ab.力量-10)/2);
  const dm = Math.floor((ab.敏捷-10)/2);
  const atkMod = Math.max(sm,dm)+pb;
  const damMod = Math.max(sm,dm);
  const dd = Math.max(1,Math.floor(((parseInt(crd.dpr.split('-')[0])||0)+(parseInt(crd.dpr.split('-')[1])||0))/2/4));
  const actions = [{name:`${d.name||'怪物'}的猛击`,type:"近战武器攻击",attack_bonus:atkMod,reach:"5尺",hit:`命中：${dd}d6+${damMod}点钝击伤害`}];
  if(cr>=2) actions.push({name:"多重攻击",type:"动作",description:`进行两次攻击`});
  if(cr>=5) actions.push({name:"吐息武器(充能5-6)",type:"动作",description:`15尺锥状，DC${crd.dc}敏捷豁免，${cr*2}d6伤害`});
  return {
    name:d.name||'原创怪物',size:d.size||'中型',type:d.type||'怪兽',alignment:d.alignment||'无阵营',
    armor_class:ac,hit_points:hp,hit_dice:`${hdNum}${hdType}+${hdNum*conMod}`,
    speed:{步行:HD[d.size]?{微型:20,小型:25,中型:30,大型:35,巨型:40,超巨型:50}[d.size]||30:30},
    abilities:ab,challenge_rating:cr,xp:crd.xp,proficiency_bonus:pb,
    damage_resistances:d.resistances||[],damage_immunities:d.immunities||[],
    special_abilities:[],actions,legendary_actions:[],
    environment:d.environment||'任意',organization:d.organization||'单独或小群',
  };
}

function mdFormat(m) {
  const abMap={力量:"力",敏捷:"敏",体质:"体",智力:"智",感知:"感",魅力:"魅"};
  let r=[`## ${m.name}`,
    `*${m.size} ${m.type}，${m.alignment}*`,"---",
    `**AC**：${m.armor_class}`,`**HP**：${m.hit_points}（${m.hit_dice}）`,
    `**速度**：${Object.entries(m.speed).map(([k,v])=>`${k}${v}尺`).join('、')}`,"",
    "|属性|值|调|","|---|---|---|"];
  for(const[a,s]of Object.entries(abMap)){const v=m.abilities[a]||10;const mod=Math.floor((v-10)/2);r.push(`|${a}(${s})|${v}|${mod>=0?'+':''}${mod}|`);}
  r.push("",`**CR**：${m.challenge_rating}（${m.xp}XP）`,`**PB**：+${m.proficiency_bonus}`,"","### 动作");
  for(const a of m.actions){r.push(`**${a.name}**。${a.hit||a.description||''}`);}
  if(m.special_abilities?.length)r.push("","### 特殊能力",...m.special_abilities.map(a=>`**${a.name}**：${a.description||''}`));
  r.push("","### 生态",`环境：${m.environment}`,`组织：${m.organization}`);
  return r.join('\n');
}

function buildEncounter(level, size, difficulty) {
  const m={easy:.5,medium:1,hard:1.5,deadly:2};
  const b={1:100,2:200,3:300,4:500,5:1000}[level]||500;
  const budget=b*size*(m[difficulty]||1);
  return{party_level:level,party_size:size,difficulty,xp_budget:Math.round(budget),
    suggested_composition:`建议使用CR${Math.max(0,level-2)}至CR${level}的怪物`,
    tips:["利用地形优势","考虑环境危害","每4-5轮可加增援"]};
}

function guideGen(mod) {
  const defaultGuide = [
    ["准备阶段",["通读模组2遍","列出NPC关系图","准备BGM"]],
    ["角色引导",["设计个人动机","与势力关联","给PC秘密目标"]],
    ["战斗策略",["地形利用","战术多样性","败退路线设计"]],
    ["技能DC",["简易10","中等15","困难20","极难25"]],
    ["休息管理",["安全地点才长休","野外可能被打断","每2-3场战斗安排短休"]],
    ["社交互动",["态度系统","DC按态度调整","派系政治"]],
    ["动态调整",["等级适应","玩家缺席处理","反馈循环"]],
    ["黄金法则",["DM最终裁决","是的，而且...","娱乐优先"]],
  ];
  if(!mod||!mod.name)return defaultGuide;
  const locs=(mod.locations||[]).slice(0,2).join('、')||'未知地区';
  const facs=(mod.factions||[]).slice(0,2).join('、')||'未知势力';
  return [
    ["准备阶段",[`通读模组2遍`, `预计时长：${mod.estimated_playtime||'未知'}`, "准备BGM"]],
    ["角色引导",[`设计${locs}相关个人动机`, `PC与${facs}联系`, "给每个PC秘密目标"]],
    ["战斗策略",["利用地形优势","多样化战术","设计败退路线"]],
    ["技能DC",["简易10","中等15","困难20","极难25"]],
    ["休息管理",["安全地点才长休","野外可能被打断","时间压力防止随意长休"]],
    ["社交互动",["态度系统","按态度调整DC","派系政治"]],
    ["动态调整",["等级适应","玩家缺席处理","每局收集反馈"]],
    ["黄金法则",["DM最终裁决","是的，而且...","娱乐优先"]],
  ];
}

function quickRef(mod) {
  return [`## 快速参考：${mod.name||'模组'}`,
    `- 等级：${mod.level_range||''}`,
    `- 时长：${mod.estimated_playtime||''}`,
    `- 主题：${(mod.themes||[]).join('、')}`,
    ...(mod.factions||[]).map(f=>`- ${f}`),
    ...(mod.locations||[]).slice(0,5).map(l=>`- ${l}`),
    ...(mod.monsters||[]).slice(0,5).map(m=>`- ${m}`)].join('\n');
}

function validateMonster(d) {
  const cr=parseFloat(d.cr)||1,ac=parseInt(d.ac)||10,hp=parseInt(d.hp)||30,atk=parseInt(d.attack_bonus)||3,dpr=parseInt(d.dpr)||10;
  const crKey=cr>=1?String(Math.floor(cr)):String(cr);
  const crd=CR_TABLE[crKey]||{};
  const is=[],ss=[];
  const eac=crd.ac||13;
  if(typeof eac==='number'){const df=ac-eac;if(Math.abs(df)>2)is.push(`AC(${ac})与标准(${eac})偏差过大`);else if(df>0)ss.push(`AC(${ac})高于标准`);}
  if(crd.hp){const p=crd.hp.split('-'),mn=parseInt(p[0]),mx=parseInt(p[1]);if(hp<mn)is.push(`HP(${hp})低于${mn}`);else if(hp>mx)ss.push(`HP(${hp})较高`);}
  const ea=crd.atk||3;if(typeof ea==='number'){const df=atk-ea;if(Math.abs(df)>2)is.push(`攻击加值(${atk})偏差过大`);else if(df>0)ss.push(`攻击加值(${atk})较高`);}
  if(crd.dpr){const p=crd.dpr.split('-'),mn=parseInt(p[0]),mx=parseInt(p[1]);if(dpr<mn)is.push(`DPR(${dpr})低于${mn}`);else if(dpr>mx)ss.push(`DPR(${dpr})较高`);else ss.push(`DPR在标准范围内`);}
  let us=50;
  if(d.has_special)us+=30;
  if(d.has_legendary)us+=20;
  return{status:"ok",name:d.name||'',cr,ac,hp,attack_bonus:atk,dpr,issues:is,strengths:ss,uniqueness_score:Math.min(100,us),
    summary:`设计${is.length<=2?'合理':'需调整'}，${is.length}问题${ss.length}优点`,
    suggestions:is.length?["参考同CR怪物","明确战术角色","特殊能力≤3个"]:["可加环境互动","考虑战利品表"]};
}

// ========== API路由 ==========
async function handleAPI(apiPath, request) {
  const method = request.method;
  if(method==='OPTIONS') return new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}});

  try {
    switch(apiPath) {
      case 'greet': return json({message:"道尔，你好！我已精通DND 5R(2024)规则与被遗忘的国度世界观。",status:"ready"});

      case 'analyze': {
        if(method!=='POST') return err('需要POST');
        let text, name="未知模组";
        if((request.headers.get('Content-Type')||'').includes('multipart')){
          const fd=await request.clone().formData();
          const f=fd.get('file');
          if(!f) return err('未选择文件');
          text=await f.text();
          name=f.name.replace(/\.[^/.]+$/,"");
          text=text.replace(/[^\u4e00-\u9fff\u3000-\u303fa-zA-Z0-9\s，。！？；：、]/g,' ').replace(/\s+/g,' ').trim();
        }else{
          const d=await request.json();
          text=d.text;name=d.name||'未知模组';
          if(!text) return err('请输入模组文本');
        }
        const a=analyze(text,name);
        return json({status:"ok",name,setting:a.setting,level_range:a.level_range,
          estimated_playtime:a.estimated_playtime,themes:a.themes,factions:a.factions,
          npcs:a.npcs,monsters:a.monsters,locations:a.locations,treasure:a.treasure,
          plot_nodes:a.plot_nodes,summary:a.summary,char_count:text.length,
          report_md:reportMd(a)});
      }

      case 'create_monster': {
        if(method!=='POST') return err('需要POST');
        const d=await request.json();
        const m=designMonster(d);
        const md=mdFormat(m);
        return json({status:"ok",monster:m,markdown:md});
      }

      case 'build_encounter': {
        if(method!=='POST') return err('需要POST');
        const d=await request.json();
        return json({status:"ok",encounter:buildEncounter(parseInt(d.level)||3,parseInt(d.size)||4,d.difficulty||'medium')});
      }

      case 'generate_guide': {
        if(!analysis) return err('请先分析模组');
        const sec=guideGen(analysis);
        const r={};for(const[t,i]of sec)r[t]=i;
        return json({status:"ok",sections:r});
      }

      case 'quick_ref': {
        if(!analysis) return err('请先分析模组');
        return json({status:"ok",quick_ref:quickRef(analysis)});
      }

      case 'rules': return json({status:"ok",rules:RULES});
      case 'setting': return json({status:"ok",setting:REALMS});

      case 'monster_knowledge':
        return json({status:"ok",cr_table:CR_TABLE,hit_dice:HD,traits:TRAITS,changes:CHANGES,creation_steps:MONSTER_STEPS});

      case 'validate_monster': {
        if(method!=='POST') return err('需要POST');
        return json(validateMonster(await request.json()));
      }

      case 'monster_templates':
        return json({templates:[
          {name:"精英模板",description:"hp翻倍，AC+2，获得传奇动作",cr_adjustment:"+2"},
          {name:"Boss模板",description:"hp三倍，AC+2，豁免+2，传奇动作+巢穴动作",cr_adjustment:"+3"},
          {name:"寒冰变体",description:"伤害改为冷冻，火焰易伤",cr_adjustment:"不变"},
          {name:"火焰变体",description:"伤害改为火焰，冷冻易伤",cr_adjustment:"不变"},
        ]});

      default: return err('未知端点',404);
    }
  } catch(e) { return err(`错误: ${e.message}`,500); }
}
