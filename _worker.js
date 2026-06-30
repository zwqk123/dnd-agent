export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      if (path.startsWith('/api/dnd/')) return handleAPI(path.slice(9), request);
      return env.ASSETS.fetch(request);
    } catch (e) {
      return json({error: `服务器内部错误: ${e.message}`}, 500);
    }
  }
};

// ========== PDF文本提取（多策略） ==========
function extractPdfText(raw) {
  let text = typeof raw === 'string' ? raw : new TextDecoder('utf-8', { fatal: false }).decode(raw);
  let extracted = '';

  // 策略1: 提取PDF括号文本 (text)Tj 和 (text)TJ 模式
  let m;
  const tjRe = /\(([^)]*)\)\s*Tj/g;
  while ((m = tjRe.exec(text)) !== null) {
    const clean = m[1].replace(/\\([0-7]{3})/g, (_, c) => String.fromCharCode(parseInt(c, 8)))
      .replace(/\\([nrtf\\()])/g, ' ').replace(/\\[0-9]{1,3}/g, ' ');
    if (clean.length > 1 && /[\u4e00-\u9fff]/.test(clean)) extracted += clean + '\n';
  }

  // 策略2: 提取 TJ 数组文本 (更复杂的PDF)
  if (extracted.length < 200) {
    const tjArrRe = /\[([^\]]*)\]\s*TJ/g;
    while ((m = tjArrRe.exec(text)) !== null) {
      const inner = m[1].replace(/\(([^)]*)\)/g, (_, c) =>
        c.replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))));
      if (/[\u4e00-\u9fff]/.test(inner)) extracted += inner.replace(/\s+/g, '') + '\n';
    }
  }

  // 策略3: 过滤可读字符
  if (extracted.length < 100) {
    extracted = text.replace(/[^\u4e00-\u9fff\u3000-\u303f0-9a-zA-Z\s，。！？；：、""''（）【】《》\-—\n\r]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  // 策略4: 尝试按流对象分段
  if (extracted.length < 50) {
    const lines = text.split('\n').filter(l => l.trim().length > 10 && !/^[\x00-\x08\x0b\x0c\x0e-\x1f]*$/.test(l));
    extracted = lines.slice(0, 500).join('\n').replace(/[^\u4e00-\u9fff\u3000-\u303f0-9a-zA-Z\s，。！？；：、]/g, ' ').trim();
  }

  return extracted || raw.slice(0, 5000);
}

// ========== 沉浸式地点数据库 ==========
const LOCATION_FLAVOR = {
  "矿坑": {atmosphere:"潮湿阴冷，石壁上渗出水珠。远处的矿灯在黑暗中摇曳，金属镐与岩石碰撞的回声在甬道中回荡。空气中弥漫着金属和硝石的气息。",
    sounds:"远处的水滴声、矿镐的敲击声、偶尔传来的低语或惨叫",smells:"湿土、硝石、铁锈",desc:"废弃的矿井，木质支架已经腐朽，有些地方能看到坍塌的痕迹。墙上的矿脉在昏暗的光芒下闪烁着微光。"},
  "洞穴": {atmosphere:"绝对的黑暗包裹着一切。只有火把的光芒才能驱散几步之内的黑暗。钟乳石从洞穴顶端垂下，像巨兽的牙齿。",
    sounds:"滴水声、蝙蝠翅膀的扑动、风穿过岩缝的呜咽",smells:"潮湿的岩石、蝙蝠粪便、泥土",desc:"天然形成的洞穴系统，岩壁上覆盖着发光的苔藓。有些通道宽阔如大厅，有些则狭窄到只能侧身通过。"},
  "森林": {atmosphere:"树冠层层叠叠，只有零星的光斑洒在林间地面上。古老的树木见证了数个世纪的变迁，根系深入地底。",
    sounds:"鸟鸣、树叶沙沙声、远处的溪流声、偶尔的树枝断裂声",smells:"腐殖质、野花、松脂、雨后泥土",desc:"原始森林，参天古树的根须在地面上蜿蜒。林间小径被落叶覆盖，每一步都发出沙沙的声响。"},
  "沼泽": {atmosphere:"浓雾贴地而行，覆盖着死水潭。枯树的枝桠伸向灰白的天空，像嶙峋的手指。偶尔有气泡从泥沼中冒出。",
    sounds:"蛙鸣、虫鸣、气泡破裂声、远处不知名生物的呻吟",smells:"腐殖质、死水、草木腐烂的气息",desc:"致命的湿地，不熟悉路径的人很容易陷入泥潭。偶尔能在雾中看到废弃的遗迹或者捕食者的眼睛。"},
  "城堡": {atmosphere:"古老的石墙诉说着历史的沉重。长廊中回荡着脚步声，火把在铁架中燃烧，投下舞动的影子。",
    sounds:"盔甲的碰撞声、壁炉的噼啪声、门轴转动的呻吟",smells:"石料、铁器、蜡烛、陈年木料",desc:"石砌的堡垒，墙上挂着褪色的挂毯。宽阔的大厅可以容纳数百人，而狭窄的楼梯间只容两人并排。"},
  "神庙": {atmosphere:"神圣而肃穆的气氛笼罩着整个空间。高大石柱撑起穹顶，彩色玻璃窗投射出斑斓的光影。",
    sounds:"低沉的诵经声、烛泪融化的轻响、石板上的脚步声回荡",smells:"熏香、蜡烛、古老石料、干燥的草药",desc:"供奉神祇的圣地，墙壁上刻满了古老的浮雕和铭文。祭坛上还残留着最近祭祀的痕迹。"},
  "地城": {atmosphere:"逼仄的走廊，低矮的天花板。空气凝滞而腐臭，只有火把的光芒告诉你并非完全孤立于黑暗之中。",
    sounds:"自己的脚步声、远处机关的咔哒声、老鼠的窸窣",smells:"霉味、灰尘、血迹、腐肉",desc:"人工修建的地下建筑，要么是陵墓，要么是避难所。墙壁上能看到古代工匠留下的印记。"},
  "城市": {atmosphere:"喧嚣的街道挤满了形形色色的人。商贩的叫卖声、铁匠铺的叮当声、酒馆中的欢笑混为一体。",
    sounds:"人群的嘈杂、马蹄踏过石板路、钟楼的报时、远处市场的讨价还价",smells:"烤面包、香料、污水、马匹、铁器",desc:"繁华的城邦，街道两旁是密集的建筑。贫民窟的低矮棚屋与贵族区的石砌豪宅形成鲜明对比。"},
  "村庄": {atmosphere:"宁静的田园生活被你的到来打破。炊烟从烟囱中升起，孩子们在土路上追逐嬉戏。",
    sounds:"鸡鸣犬吠、铁匠的锤声、磨坊水车的转动",smells:"炊烟、干草、牲畜、烘焙的面包",desc:"与世无争的小定居点。村民们在田间劳作，旅店的老板娘正在准备晚餐。这里的一切都是那么简单而真实。"},
  "荒野": {atmosphere:"一望无际的原野在风中起伏。远处的山脉在地平线上勾勒出青灰色的轮廓。天地间仿佛只有你一人。",
    sounds:"风声、虫鸣、鸟类的鸣叫、远处野兽的低吼",smells:"野草、泥土、野花、自由的气息",desc:"广袤无人的野外，古老的商道早已被野草覆盖。这里曾是某场战役的现场，也可能是远古巨兽的领地。"},
};

function getLocationFlavor(name) {
  for (const [kw, data] of Object.entries(LOCATION_FLAVOR)) {
    if (name.includes(kw)) return data;
  }
  return {atmosphere:"未知环境，前路未知。空气中弥漫着不确定性。",sounds:"寂静——或者你尚未能分辨的声响",
    smells:"未知且陌生的气息",desc:"这是一个你尚未了解的地方。保持警惕。"};
}

// ========== 知识库 ==========
const CR_TABLE = {
  "0":{xp:10,pb:2,ac:13,hp:"1-6",atk:3,dc:10,dpr:"0-1"},"1/8":{xp:25,pb:2,ac:13,hp:"7-35",atk:3,dc:10,dpr:"2-3"},
  "1/4":{xp:50,pb:2,ac:13,hp:"36-49",atk:3,dc:10,dpr:"4-5"},"1/2":{xp:100,pb:2,ac:13,hp:"50-70",atk:3,dc:10,dpr:"6-8"},
  "1":{xp:200,pb:2,ac:13,hp:"71-85",atk:3,dc:10,dpr:"9-14"},"2":{xp:450,pb:2,ac:13,hp:"86-100",atk:3,dc:10,dpr:"15-20"},
  "3":{xp:700,pb:2,ac:13,hp:"101-115",atk:4,dc:10,dpr:"21-26"},"4":{xp:1100,pb:2,ac:14,hp:"116-130",atk:5,dc:10,dpr:"27-32"},
  "5":{xp:1800,pb:3,ac:15,hp:"131-145",atk:6,dc:11,dpr:"33-38"},"6":{xp:2300,pb:3,ac:15,hp:"146-160",atk:6,dc:11,dpr:"39-44"},
  "7":{xp:2900,pb:3,ac:15,hp:"161-175",atk:6,dc:11,dpr:"45-50"},"8":{xp:3900,pb:3,ac:16,hp:"176-190",atk:7,dc:12,dpr:"51-56"},
  "9":{xp:5000,pb:4,ac:16,hp:"191-205",atk:7,dc:12,dpr:"57-62"},"10":{xp:5900,pb:4,ac:17,hp:"206-220",atk:7,dc:12,dpr:"63-68"},
  "11":{xp:7200,pb:4,ac:17,hp:"221-235",atk:8,dc:13,dpr:"69-74"},"12":{xp:8400,pb:4,ac:17,hp:"236-250",atk:8,dc:13,dpr:"75-80"},
  "13":{xp:10000,pb:5,ac:18,hp:"251-265",atk:8,dc:13,dpr:"81-86"},"14":{xp:11500,pb:5,ac:18,hp:"266-280",atk:8,dc:13,dpr:"87-92"},
  "15":{xp:13000,pb:5,ac:18,hp:"281-295",atk:9,dc:14,dpr:"93-98"},"16":{xp:15000,pb:5,ac:18,hp:"296-310",atk:9,dc:14,dpr:"99-104"},
  "17":{xp:18000,pb:6,ac:19,hp:"311-325",atk:10,dc:15,dpr:"105-110"},"18":{xp:20000,pb:6,ac:19,hp:"326-340",atk:10,dc:15,dpr:"111-116"},
  "19":{xp:22000,pb:6,ac:19,hp:"341-355",atk:10,dc:15,dpr:"117-122"},"20":{xp:25000,pb:6,ac:19,hp:"356-400",atk:10,dc:15,dpr:"123-140"},
  "21":{xp:33000,pb:7,ac:20,hp:"401-445",atk:11,dc:16,dpr:"141-158"},"22":{xp:41000,pb:7,ac:20,hp:"446-490",atk:11,dc:16,dpr:"159-176"},
  "23":{xp:50000,pb:7,ac:20,hp:"491-535",atk:11,dc:16,dpr:"177-194"},"24":{xp:62000,pb:7,ac:20,hp:"536-580",atk:12,dc:17,dpr:"195-212"},
  "25":{xp:75000,pb:8,ac:21,hp:"581-625",atk:12,dc:17,dpr:"213-230"},"26":{xp:90000,pb:8,ac:21,hp:"626-670",atk:12,dc:17,dpr:"231-248"},
  "27":{xp:105000,pb:8,ac:22,hp:"671-715",atk:13,dc:18,dpr:"249-266"},"28":{xp:120000,pb:8,ac:22,hp:"716-760",atk:13,dc:18,dpr:"267-284"},
  "29":{xp:135000,pb:9,ac:22,hp:"761-805",atk:13,dc:18,dpr:"285-302"},"30":{xp:155000,pb:9,ac:23,hp:"806-850",atk:14,dc:19,dpr:"303-320"},
};
const HD = {微型:"d4",小型:"d6",中型:"d8",大型:"d10",巨型:"d12",超巨型:"d20"};
const RULES = {core_mechanics:{d20_test:"所有检定基于d20投骰+属性调整值+熟练加值",advantage_disadvantage:"优势掷两次取高，劣势掷两次取低",proficiency_bonus:"1-4级+2，5-8级+3，9-12级+4，13-16级+5，17-20级+6",six_abilities:"力量/敏捷/体质/智力/感知/魅力",skill_list:"运动/特技/巧手/隐匿/奥秘/历史/调查/自然/宗教/驯兽/洞察/医药/察觉/生存/威吓/表演/游说/欺骗"},combat:{initiative:"先攻=敏捷检定",cover:"半掩护AC+2，四分之三掩护AC+5",attack_roll:"攻击检定=d20+属性调整值+熟练加值",critical_hit:"重击时伤害骰投两次加调整值"},damage_types:["强酸","冷冻","火焰","力场","闪电","暗蚀","毒素","心灵","光耀","雷鸣","挥砍","穿刺","钝击"],conditions:["魅惑","晕眩","耳聋","力竭","恐慌","擒抱","失能","隐形","麻痹","石化","中毒","倒地","压制","束缚","震慑","昏迷","减速"],version:"v3-fix"};
const REALMS = {world_name:"艾伯尔-托瑞尔(Abeir-Toril)，简称托瑞尔",continents:{faerun:"费伦-欧洲中世纪风格",kara_tur:"卡拉图-东方风格"},sword_coast_cities:{neverwinter:"绝冬城-知识之城",waterdeep:"深水城-辉煌之城",baldurs_gate:"博德之门-贸易港口",phandalin:"梵杜尔-矿业小镇"},pantheon:{overdeity:"艾欧(Ao)-神上神",greater_deities:[["阿祖斯","法师之神"],["班恩","暴政之神"],["查提","农业女神"],["密斯特拉","魔法女神"],["提尔","正义之神"]]},timeline_notes:{current_year_5e:"1490 DR左右",spellplague:"法术瘟疫(1385 DR)剧烈动荡"}};
const TRAITS = {defensive:[["魔法抗性","豁免优势"],["传奇抗性(3/日)","失败变成功"]],offensive:[["多重攻击","多次攻击"],["吐息武器","范围伤害"]],mobility:[["飞行","飞行速度"],["钻地","钻地速度"]],senses:[["黑暗视觉","黑暗中视物"],["真实视觉","看穿隐形"]]};
const CHANGES = {hp_formula:"2024:HP=9+18xCR",dpr_ratio:"2024:伤害/HP比约0.4",legendary_actions:"传奇动作计入DPR"};

function json(data, s = 200) { return new Response(JSON.stringify(data), {status:s, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}}); }
function err(msg, s = 400) { return json({error: msg}, s); }

// ========== 模组深入分析 ==========
let analysis = null;
function analyzeModule(text, name) {
  const hasKw = kw => text.includes(kw);
  const countKw = kw => (text.match(new RegExp(kw, 'g')) || []).length;
  const extractNames = (pattern) => { const m = text.match(pattern); return m ? [...new Set(m)].slice(0, 15) : []; };

  const locations = (()=>{
    const s = new Set();
    for (const k of ["矿坑","洞穴","塔楼","城堡","神庙","遗迹","森林","沼泽","山脉","河流","港口","城市","村庄","地牢","墓穴","神殿","宫殿","图书馆","旅店","酒馆","市场","广场","港口","大桥","墓地","神殿","花园","地窖","大厅","走廊","卧室","书房","庭院","马厩","兵营","牢房","祭坛","洞穴","矿坑","废墟","高塔","桥梁","大门","城墙","山谷","溪流","瀑布","湖泊","丘陵","平原","隧道","密室","瞭望塔","铁匠铺","磨坊","谷仓","教堂","学校"]) {
      const p = new RegExp(`([\\u4e00-\\u9fff]{1,8}${k})`, 'g'); const m = text.match(p);
      if (m) m.forEach(x => s.add(x));
    }
    return s.size ? [...s].slice(0, 10) : ["（未提取到）"];
  })();

  const monsters = (()=>{
    const all = ["地精","熊地精","大地精","狗头人","食人魔","巨魔","狼","恐狼","蜘蛛","相位蜘蛛","僵尸","骷髅","幽灵","吸血鬼","狼人","龙","幼龙","飞龙","蛇鸡兽","狮鹫","眼魔","夺心魔","底栖魔鱼","石像鬼","魔像","黏液","真菌","鼠群","蝙蝠","蛇","蜈蚣","蝎子","蚁","虫","元素","魔蝠","魔鬼","恶魔","精类","树人","巨蟒","虎","熊","野猪","猎鹰","猫头鹰","马","骡","骆驼"];
    const r = []; for (const m of all) { if (hasKw(m)) r.push(`${m}(${countKw(m)}次)`); }
    return r.length ? r.slice(0, 20) : ["（未检测到）"];
  })();

  const npcs = extractNames(/([\u4e00-\u9fff]{2,4}(?:法师|战士|商人|领主|祭司|盗贼|国王|女王|公爵|夫人|小姐|先生|老人|小孩|精灵|矮人|半身人|侏儒|恶魔|魔鬼|猎人|铁匠|农夫|渔夫|厨师|学者|诗人|艺人|祭司|牧师|骑士|将军|船长|管家|女仆|守卫))/g);
  const factions = (()=>{ const k={"散塔林":"散塔林会(Zhentarim)","竖琴手":"竖琴手(Harpers)","护盾骑士":"护盾骑士(Order of the Gauntlet)","翠绿":"翠绿闲庭(Emerald Enclave)","领主联盟":"领主联盟(Lords Alliance)","拜龙教":"拜龙教(Cult of the Dragon)","红袍":"红袍法师会(Red Wizards)"}; const r=[]; for(const[kw,v]of Object.entries(k))if(hasKw(kw))r.push(v); return r.length?r:["（未检测到）"]; })();

  const d = {
    name: name || "未知模组", char_count: text.length,
    summary: (()=>{
      const l = text.split('\n');
      for (let i = 0; i < l.length; i++) for (const k of ["背景","简介","概述","故事","前言","序章","序幕"])
        if (l[i].includes(k) && l[i].length < 50) return l.slice(i, i+10).join('\n').slice(0, 500);
      return "（未提取到摘要）";
    })(),
    level_range: text.match(/(\d+)[-~至到](\d+)\s*级/)?.[0]?.replace(/(\d+)[-~至到](\d+)\s*级/, "第$1级至第$2级") || text.match(/(\d+)\s*级/)?.[0]?.replace(/(\d+)\s*级/, "第$1级") || "（未知）",
    setting: (()=>{
      const k = {"费伦":"被遗忘的国度-费伦","剑湾":"被遗忘的国度-剑湾","深水城":"费伦-深水城","博德之门":"费伦-博德之门","绝冬城":"费伦-绝冬城","幽暗地域":"费伦-幽暗地域","梵杜尔":"费伦-剑湾北地","安姆":"费伦-安姆","科米尔":"费伦-科米尔","卡林杉":"费伦-卡林杉"};
      return Object.values(k).filter((_,i) => hasKw(Object.keys(k)[i])).join("、") || "（未知设定）";
    })(),
    factions, npcs: npcs.length ? npcs : ["（建议手动识别）"],
    monsters, locations,
    treasure: (()=>{ const k=["魔法","武器","护甲","戒指","项链","药水","卷轴","法杖","权杖","宝石","金币","神器","魔杖","盔甲","盾牌","护符","斗篷","手套","靴子","头盔","书籍","地图","钥匙","雕像","宝箱","秘银","精金","龙鳞","珍珠","钻石","红宝石","蓝宝石","绿宝石"]; return k.filter(kw=>hasKw(kw)); })(),
    plot_nodes: (()=>{ const k=["阴谋","计划","秘密","线索","陷阱","背叛","联盟","战争","预言","诅咒","封印","仪式","献祭","复活","觉醒","交易","伪装","跟踪","暗杀","盗窃","决斗","审判","逃亡","追捕","营救","谈判","联盟","会议","庆典","葬礼","婚礼","宴会","节日"]; return k.filter(kw=>hasKw(kw)); })(),
    estimated_playtime: text.length > 500000 ? "40+小时（大型战役）" : text.length > 200000 ? "16-40小时（中型模组）" : text.length > 50000 ? "4-16小时（小型模组）" : "1-4小时（短篇冒险）",
    themes: (()=>{ const t=[["探索","探索未知"],["战斗","激烈战斗"],["谜题","解谜推演"],["社交","社交交涉"],["谈判","社交交涉"],["潜行","潜行渗透"],["地城","地城探险"],["荒野","荒野求生"],["城市","城市冒险"],["恐怖","恐怖惊悚"],["悬疑","悬疑查案"],["政治","政治阴谋"],["战争","战争冲突"],["海上","航海冒险"],["空中","天空探险"],["水中","水下探索"],["遗迹","遗迹考古"],["魔法","魔法奥秘"],["神祇","神圣干预"],["恶魔","恶魔威胁"]]; return [...new Set(t.filter(([k])=>text.includes(k)).map(([,v])=>v))].slice(0,5)||["综合冒险"]; })(),
    atmosphere: (()=>{
      if (hasKw("恐怖") || hasKw("惊悚") || hasKw("黑暗")) return "阴郁压抑，黑暗笼罩着整个故事。每一个阴影都可能潜藏着危险，每一段沉默都可能预示着灾祸。";
      if (hasKw("史诗") || hasKw("战争") || hasKw("大战")) return "宏大壮阔，整个世界在命运的齿轮下转动。英雄的抉择将影响无数人的命运。";
      if (hasKw("轻松") || hasKw("喜剧") || hasKw("幽默") || hasKw("欢乐")) return "轻松明快，带着诙谐和幽默。即便身处冒险之中，欢笑也从未远离。";
      if (hasKw("悬疑") || hasKw("阴谋") || hasKw("秘密")) return "疑云密布，真相隐藏在重重迷雾之中。每个人似乎都有不可告人的秘密。";
      if (hasKw("浪漫") || hasKw("情感") || hasKw("感人")) return "温情脉脉，故事的核心是人与人之间的情感羁绊。在冒险中培养的情谊最为珍贵。";
      return "波澜壮阔，一个典型的DND冒险故事。英雄们被命运召集，踏上了改变世界的征途。";
    })(),
  };
  analysis = d;
  return d;
}

function generateImmersionGuide(mod) {
  const locs = (mod.locations || []).filter(l => l !== "（未提取到）");
  const locationDetails = locs.map(name => {
    const flavor = getLocationFlavor(name);
    return { name, atmosphere: flavor.atmosphere, sounds: flavor.sounds, smells: flavor.smells, description: flavor.desc };
  });

  const topTheme = (mod.themes || ["冒险"])[0];
  const hooks = [
    `开场钩子：玩家角色们因为不同的原因来到了${(mod.locations||["起点"])[0]}——有人为了寻宝，有人为了复仇，有人只是恰好路过。但命运让他们的道路在这里交汇。`,
    `背景融合：建议根据每个PC的背景故事，私下一对一给出一个与${mod.name||"本模组"}相关的个人目标。这个目标可以是秘密的，也可以公开。`,
    `世界观代入：在游戏开始前，给玩家发送一段关于${mod.setting||"这个世界"}的短文或一首诗，让他们在第一次游戏前已经对世界有所感知。`,
    `角色关系网：在Session 0中，让每个玩家与其他1-2个PC建立已有的关系——老友、宿敌、前同事、远亲。关系越复杂，故事越精彩。`,
  ];

  const worldIntro = mod.setting && !mod.setting.includes("未知") ?
    `本模组的故事发生在${mod.setting}。这片土地承载着数千年的历史——古老帝国的遗迹散落在荒野之中，诸神的意志依然影响着凡人的命运。在这里，魔法是真实存在的力量，怪物并非传说，而英雄可以改变世界。` :
    "故事发生在托瑞尔世界，一片充满魔法与奇迹的大陆。古老的预言、沉睡的邪恶、隐秘的组织——一切都在等待着被发现。";

  const sessionZero = [
    `在正式开始前安排一次 Session 0：与玩家一起创建角色并讨论彼此的期待`,
    `设定游戏基调：${topTheme}是本次冒险的核心风格，请确保玩家对此有所准备`,
    `讨论敏感主题：模组可能涉及的内容请提前沟通，确保所有玩家感到舒适`,
    `角色动机讨论：为什么${(mod.locations||["冒险之地"]).slice(0,2).join('和')}需要这群特定的英雄？而不是其他人？`,
    `建立联系：鼓励玩家创建彼此已有羁绊的角色，而非互不相识的陌生人`,
  ];

  const musicSuggestions = [];
  if (mod.themes?.includes("地城探险")) musicSuggestions.push("地城场景：推荐使用《Skyrim: Dungeons》或《Darkest Dungeon》原声");
  if (mod.themes?.includes("战斗")) musicSuggestions.push("战斗场景：Epic battle music from Two Steps from Hell");
  if (mod.themes?.includes("城市冒险")) musicSuggestions.push("城市场景：中世纪酒馆音乐或《The Witcher 3》Novigrad主题");
  if (mod.themes?.includes("悬疑")) musicSuggestions.push("悬疑场景：神秘低沉的ambient音乐，推荐《Dark Souls》系列配乐");
  if (mod.themes?.includes("荒野求生")) musicSuggestions.push("野外场景：《Breath of the Wild》原声或自然ambient");

  const npcRoleplay = (mod.npcs || []).filter(n => n !== "（建议手动识别）").slice(0, 5).map(n => ({
    name: n,
    voiceTip: `在为${n}配音时，尝试赋予其独特的声音特征——语速、音调、口癖`,
    motivation: `思考${n}的真正动机：他们想要什么？为什么帮助/阻碍玩家？`,
    secret: `给${n}准备一个只有你知道的秘密——也许与主线无关，但会让NPC更有血肉`,
  }));

  return {
    world_intro: worldIntro,
    atmosphere: mod.atmosphere || "一个充满冒险与神秘的世界",
    location_details: locationDetails,
    player_hooks: hooks,
    session_zero_advice: sessionZero,
    music_suggestions: musicSuggestions.length ? musicSuggestions : ["根据场景氛围选择适合的BGM"],
    npc_roleplay_tips: npcRoleplay,
    dm_tips: [
      "描述时调用五感：不只是视觉，还有声音、气味、触感、温度",
      "让世界回应玩家的行动：好的行为得到褒奖，恶行也有后果",
      "NPC不是发布任务的工具——他们是活生生的人，有自己的生活和目标",
      "如果玩家偏离了剧本，不要强行拉回——让他们的选择也有意义",
    ],
  };
}

// ========== 报告生成 ==========
function fullReport(d) {
  const imm = generateImmersionGuide(d);
  let r = [`# 📜 完整模组分析报告：${d.name}`,"",
    `## 一、基本信息`,`- **设定世界**：${d.setting}`,`- **推荐等级**：${d.level_range}`,`- **预估时长**：${d.estimated_playtime}`,
    `- **核心主题**：${d.themes.join('、')}`,`- **文本规模**：${d.char_count}字符`,"",
    `## 二、故事基调`,`${d.atmosphere||"一个典型的DND冒险故事"}`,"",
    `## 三、世界观导入`,`${imm.world_intro}`,"",
    `## 四、剧情摘要`,d.summary,"",
    `## 五、关键地点与氛围`,`---治疗建议--- 每个地点都可以用五感描述法来呈现：`];
  for (const loc of imm.location_details) {
    r.push(`\n### ${loc.name}`,`**氛围**：${loc.atmosphere}`,`**听见**：${loc.sounds}`,`**闻到**：${loc.smells}`,`**描述**：${loc.description}`);
  }
  r.push("",`## 六、NPC与势力`,...d.factions.map(f=>`- 势力：${f}`),...d.npcs.map(n=>`- NPC：${n}`));
  for (const tip of imm.npc_roleplay_tips) {
    r.push(`\n**${tip.name}**：${tip.voiceTip}`, `  动机：${tip.motivation}`, `  秘密：${tip.secret}`);
  }
  r.push("",`## 七、怪物分布`,...d.monsters.map(m=>`- ${m}`),"",
    `## 八、宝藏与奖励`,...d.treasure.map(t=>`- ${t}`),"",
    `## 九、检测到的剧情元素`,...d.plot_nodes.map(p=>`- ${p}`),"",
    `## 十、玩家代入指南`,"",`**世界背景**：${imm.world_intro}`,"",`**整体氛围**：${imm.atmosphere}`,"");
  for (const h of imm.player_hooks) r.push(`- ${h}`);
  r.push("",`## 十一、Session 0 建议`);
  for (const a of imm.session_zero_advice) r.push(`- ${a}`);
  if (imm.music_suggestions.length) r.push("",`## 十二、音乐建议`,...imm.music_suggestions.map(m=>`- ${m}`));
  r.push("",`## 十三、DM带团提示`,...imm.dm_tips.map(t=>`- ${t}`));
  return r.join('\n');
}

// ========== 怪物 ==========
function designMonster(d) {
  const ab = {力量:parseInt(d.str)||10,敏捷:parseInt(d.dex)||10,体质:parseInt(d.con)||10,智力:parseInt(d.int)||10,感知:parseInt(d.wis)||10,魅力:parseInt(d.cha)||10};
  const cr=parseInt(d.cr)||1; const crKey=String(cr); const crd=CR_TABLE[crKey]||{pb:2,ac:13,atk:3,dc:10,xp:200};
  const conMod=Math.floor((ab.体质-10)/2); const hdType=HD[d.size]||"d8"; const hdSize=parseInt(hdType.substring(1));
  const hdAvg=(hdSize+1)/2; const hdNum=Math.max(1,Math.round(78/(hdAvg+conMod))); const hp=Math.round(hdNum*(hdAvg+conMod));
  const ac=crd.ac+Math.floor(Math.random()*3)-1; const pb=crd.pb;
  const sm=Math.floor((ab.力量-10)/2), dm2=Math.floor((ab.敏捷-10)/2);
  const atkMod=Math.max(sm,dm2)+pb; const damMod=Math.max(sm,dm2);
  const dd=Math.max(1,Math.floor((parseInt(crd.dpr.split('-')[0]||"0")+parseInt(crd.dpr.split('-')[1]||"0"))/2/4));
  const acts=[{name:`${d.name||'怪物'}的猛击`,type:"近战武器攻击",attack_bonus:atkMod,reach:"5尺",hit:`命中：${dd}d6+${damMod}点钝击伤害`}];
  if(cr>=2) acts.push({name:"多重攻击",type:"动作",description:`进行两次猛击攻击`});
  if(cr>=5) acts.push({name:"吐息武器(充能5-6)",type:"动作",description:`15尺锥状，DC${crd.dc}敏捷豁免，${cr*2}d6伤害，成功减半`});
  return {name:d.name||'原创怪物',size:d.size||'中型',type:d.type||'怪兽',alignment:d.alignment||'无阵营',
    armor_class:ac,hit_points:hp,hit_dice:`${hdNum}${hdType}+${hdNum*conMod}`,
    speed:{步行:{微型:20,小型:25,中型:30,大型:35,巨型:40,超巨型:50}[d.size]||30},
    abilities:ab,damage_resistances:d.resistances||[],damage_immunities:d.immunities||[],
    special_abilities:d.specialAbilities||[],actions:acts,legendary_actions:d.legendaryActions||[],
    challenge_rating:cr,xp:crd.xp,proficiency_bonus:pb,environment:d.environment||'任意',organization:d.organization||'单独或小群'};
}

function mdFormat(m) {
  const am={力量:"力",敏捷:"敏",体质:"体",智力:"智",感知:"感",魅力:"魅"};
  let r=[`## ${m.name}`,`*${m.size}${m.type}，${m.alignment}*`,"---",`**AC**：${m.armor_class}`,`**HP**：${m.hit_points}（${m.hit_dice}）`,`**速度**：${Object.entries(m.speed).map(([k,v])=>`${k}${v}尺`).join('、')}`,"","|属性|值|调|","|---|---|---|"];
  for(const[a,s]of Object.entries(am)){const v=m.abilities[a]||10;const mod=Math.floor((v-10)/2);r.push(`|${a}(${s})|${v}|${mod>=0?'+':''}${mod}|`);}
  if(m.damage_resistances?.length)r.push(`**抗性**：${m.damage_resistances.join('、')}`);
  if(m.damage_immunities?.length)r.push(`**免疫**：${m.damage_immunities.join('、')}`);
  r.push(`**CR**：${m.challenge_rating}（${m.xp}XP）`,`**PB**：+${m.proficiency_bonus}`,"","### 动作");
  for(const a of m.actions)r.push(`**${a.name}**。${a.hit||a.description||''}`);
  if(m.special_abilities?.length)r.push("","### 特殊能力",...m.special_abilities.map(a=>`**${a.name||a}**`));
  if(m.legendary_actions?.length)r.push("","### 传奇动作",...m.legendary_actions.map(a=>`**${a.name||a}**`));
  r.push("","### 生态",`环境：${m.environment}`,`组织：${m.organization}`);
  return r.join('\n');
}

function buildEncounter(lvl, size, diff) {
  const m={easy:.5,medium:1,hard:1.5,deadly:2}; const b={1:100,2:200,3:300,4:500,5:1000,6:1200,7:1500,8:2000,9:2500,10:3000}[lvl]||500;
  const budget=b*size*(m[diff]||1);
  return {party_level:lvl,party_size:size,difficulty:diff,xp_budget:Math.round(budget),suggested_composition:`建议使用CR${Math.max(0,lvl-2)}至CR${lvl}的怪物`,tips:["利用地形优势制造战术深度","考虑添加环境危害元素","每4-5轮可考虑增援","给非野兽怪物设计败退路线","在战斗中埋下剧情伏笔"]};
}

// ========== DM Guide ==========
function guideGen(mod) {
  const def=[["准备阶段",["通读模组2遍","列出所有NPC关系图谱","关键战斗提前模拟测试","准备场景BGM播放列表"]],["角色引导",["设计PC与主线的个人联系","给每个PC一个秘密个人目标","用 你们因某事被绑在一起 代替 在酒馆相遇"]],["战斗策略",["利用地形优势制造记忆点","不同怪物使用差异化战术","设计败退路线避免全歼","让战斗有多个胜利条件"]],["技能建议",["DC10常识任务","DC15中等技巧","DC20专业领域","允许玩家描述成功方式增加沉浸感"]],["休息管理",["安全区域才可长休","野外休息可能被打断","时间压力防止随意长休","每2-3战后安排短休"]],["社交互动",["态度系统：敌对→不友好→中立→友好→热情","DC随态度调整","帮一派扣另一派好感"]],["动态调整",["超等级加怪物数量或提高CR","低于等级减数量或加NPC协助","太快加随机遭遇，太慢合并次要遭遇","每次游戏收集5分钟玩家反馈"]],["黄金法则",["DM最终裁决","是的而且——接受玩家创意","娱乐优先于规则准确性","保持一致裁决","每次带团后复盘"]]];
  if(!mod||!mod.name)return def;
  const locs=(mod.locations||[]).slice(0,2).join('、')||'未知'; const facs=(mod.factions||[]).slice(0,2).join('、')||'未知';
  return [["准备阶段",[`通读模组2遍，预估${mod.estimated_playtime||'未知'}的带团时间`,`准备${mod.setting||'该世界'}相关的背景知识`,`为本模组${(mod.themes||['冒险']).slice(0,2).join('、')}风格准备BGM`]],["角色引导",[`为每个PC设计与${locs}相关的个人动机`,`让PC与${facs}建立联系——作为盟友或敌人`,`给每个PC一个只有DM知道的秘密`]],["战斗策略",["利用地形优势","多样化战术","设计败退路线","考虑环境交互"]],["技能DC",["DC10简易","DC15中等","DC20困难","DC25极难"]],["休息管理",["安全长休","野外中断","时间压力"]],["社交互动",["态度系统","动态DC","派系政治"]],["动态调整",["等级适应","缺席处理","进度调整","反馈循环"]],["黄金法则",["DM最终裁决","是的而且","娱乐优先","保持一致","持续学习"]]];
}

function quickRef(mod) {
  const l=[`## 快速参考：${mod.name||'模组'}`,`- 等级：${mod.level_range||''}`,`- 时长：${mod.estimated_playtime||''}`,`- 主题：${(mod.themes||[]).join('、')}`];
  if(mod.factions?.length)l.push("","### 势力",...mod.factions.map(f=>`- ${f}`));
  if(mod.locations?.length)l.push("","### 关键地点",...mod.locations.slice(0,5).map(l=>`- ${l}`));
  if(mod.npcs?.length)l.push("","### 重要NPC",...mod.npcs.slice(0,5).map(n=>`- ${n}`));
  if(mod.monsters?.length)l.push("","### 怪物",...mod.monsters.slice(0,5).map(m=>`- ${m}`));
  l.push("","### 注意事项","- PC超等级：增加怪物数量或升级模板","- PC低于等级：允许额外短休或提供NPC协助");
  return l.join('\n');
}

function validateMonster(d) {
  const cr=parseFloat(d.cr)||1,ac=parseInt(d.ac)||10,hp=parseInt(d.hp)||30,atk=parseInt(d.attack_bonus)||3,dpr2=parseInt(d.dpr)||10;
  const crKey=cr>=1?String(Math.floor(cr)):String(cr); const crd=CR_TABLE[crKey]||{};
  const is=[],ss=[];
  const eac=crd.ac||13; if(typeof eac==='number'){const df=ac-eac; if(Math.abs(df)>2)is.push(`AC(${ac})与标准(${eac})偏差>2`); else if(df>0)ss.push(`AC(${ac})高于标准`);}
  if(crd.hp){const p=crd.hp.split('-'),mn=parseInt(p[0]),mx=parseInt(p[1]); if(hp<mn)is.push(`HP(${hp})低于${mn}`); else if(hp>mx)ss.push(`HP(${hp})较高`);}
  const ea=crd.atk||3; if(typeof ea==='number'){const df=atk-ea; if(Math.abs(df)>2)is.push(`攻击加值(${atk})偏差>2`); else if(df>0)ss.push(`攻击加值(${atk})较高`);}
  if(crd.dpr){const p=crd.dpr.split('-'),mn=parseInt(p[0]),mx=parseInt(p[1]); if(dpr2<mn)is.push(`DPR(${dpr2})低于${mn}`); else if(dpr2>mx)ss.push(`DPR(${dpr2})较高`); else ss.push(`DPR在标准范围${mn}-${mx}内`);}
  let us=50; if(d.has_special)us+=30; if(d.has_legendary)us+=20;
  return {status:"ok",name:d.name||'',cr,ac,hp,attack_bonus:atk,dpr:dpr2,issues:is,strengths:ss,uniqueness_score:Math.min(100,us),
    summary:`设计${is.length<=2?'合理':'需调整'}：${is.length}个问题${ss.length}个优点`,suggestions:is.length>0?["参考同CR怪物","明确战术角色(强攻/伏击/领袖)","特殊能力≤3个"]:["可加环境互动","考虑战利品表"]};
}

// ========== API路由 ==========
async function handleAPI(apiPath, request) {
  const method = request.method;
  if (method === 'OPTIONS') return new Response(null, {headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}});
  try {
    switch (apiPath) {
      case 'greet': return json({message:"道尔，你好！我已精通DND 5R(2024)规则体系、怪物构建原理和被遗忘的国度世界观。我可以分析模组、创建怪物、生成带团指南和沉浸式导入建议。",status:"ready"});
      case 'debug_test': {
        const d2 = method==='POST' ? await request.json() : {};
        const t = d2.text || '';
        const kw = d2.keyword || '';
        return json({input:t, keyword:kw, includes:t.includes(kw), length:t.length, now:Date.now()});
      }

      case 'analyze': {
        if (method !== 'POST') return err('需要POST请求');
        let text, name = "未知模组";
        if ((request.headers.get('Content-Type')||'').includes('multipart')) {
          const fd = await request.clone().formData(); const f = fd.get('file');
          if (!f) return err('未选择文件');
          text = await f.text();
          text = extractPdfText(text);
          name = f.name.replace(/\.[^/.]+$/, "");
        } else {
          const d = await request.json(); text = d.text; name = d.name || '未知模组';
          if (!text) return err('请输入模组文本');
        }
        const a = analyzeModule(text, name);
        const imm = generateImmersionGuide(a);
        return json({status:"ok", name, setting:a.setting, level_range:a.level_range, estimated_playtime:a.estimated_playtime,
          themes:a.themes, atmosphere:a.atmosphere, factions:a.factions, npcs:a.npcs, monsters:a.monsters,
          locations:a.locations, treasure:a.treasure, plot_nodes:a.plot_nodes, summary:a.summary,
          char_count:a.char_count, immersion: imm, report_md: fullReport(a)});
      }

      case 'immersion': {
        if (!analysis) return err('请先分析模组');
        return json({status:"ok", immersion: generateImmersionGuide(analysis)});
      }

      case 'create_monster': {
        if (method !== 'POST') return err('需要POST请求');
        const d = await request.json(); const m = designMonster(d);
        return json({status:"ok", monster:m, markdown:mdFormat(m)});
      }

      case 'build_encounter': {
        if (method !== 'POST') return err('需要POST请求');
        const d = await request.json();
        return json({status:"ok", encounter:buildEncounter(parseInt(d.level)||3, parseInt(d.size)||4, d.difficulty||'medium')});
      }

      case 'generate_guide': {
        if (!analysis) return err('请先分析模组');
        const sec = guideGen(analysis); const r={}; for(const[t,i]of sec)r[t]=i;
        return json({status:"ok", sections:r});
      }

      case 'quick_ref': {
        if (!analysis) return err('请先分析模组');
        return json({status:"ok", quick_ref:quickRef(analysis)});
      }

      case 'rules': return json({status:"ok", rules:RULES});
      case 'setting': return json({status:"ok", setting:REALMS});

      case 'monster_knowledge':
        return json({status:"ok", cr_table:CR_TABLE, hit_dice:HD, traits:TRAITS, changes:CHANGES, creation_steps:["1.确定概念","2.选择体型","3.设定CR","4.分配属性","5.计算HP","6.确定AC","7.确定攻击加值","8.计算伤害","9.添加特性","10.细化描述"]});

      case 'validate_monster': {
        if (method !== 'POST') return err('需要POST请求');
        return json(validateMonster(await request.json()));
      }

      case 'monster_templates':
        return json({templates:[
          {name:"精英模板",description:"hp翻倍，AC+2，获得传奇动作",cr_adjustment:"+2"},
          {name:"Boss模板",description:"hp三倍，AC+2，豁免+2，传奇+巢穴动作",cr_adjustment:"+3"},
          {name:"寒冰变体",description:"伤害改为冷冻，获得冷冻抗性",cr_adjustment:"不变"},
          {name:"火焰变体",description:"伤害改为火焰，获得火焰抗性",cr_adjustment:"不变"},
          {name:"魔法变异",description:"hp+50%，附加1d6强酸伤害",cr_adjustment:"+1"},
        ]});

      default: return err(`未知端点: ${apiPath}`, 404);
    }
  } catch(e) { return err(`服务器错误: ${e.message}`, 500); }
}
