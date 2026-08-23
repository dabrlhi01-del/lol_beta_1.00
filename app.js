
const CATALOG=window.LOL_PATCH_CATALOG;
let patch=CATALOG.patches[0];
const $=id=>document.getElementById(id);
const fmt=(n,d=0)=>Number(n).toLocaleString("ko-KR",{maximumFractionDigits:d});
const cleanHTML=(h="")=>h.replace(/<br\s*\/?>/gi," ").replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim();

const ROLES=[
 {key:"top",name:"탑",icon:"▲",quest:"상단 공격로 퀘스트",desc:"완료 시 레벨 제한 20, +600 경험치, 이후 경험치 획득량 +12.5%. 순간이동 관련 추가 보상도 획득.",effects:["레벨 상한 20","+600 XP","향후 XP +12.5%","순간이동 강화"]},
 {key:"jungle",name:"정글",icon:"◆",quest:"정글 퀘스트",desc:"완료 시 강타 최종 피해 1,400. 정글/강가 이동속도 +4%, 비전투 시 +8%, 대형 몬스터마다 +10골드/+10XP.",effects:["강타 1,400","정글/강가 MS +4%","비전투 MS +8%","대형 몬스터 +10G/+10XP"]},
 {key:"mid",name:"미드",icon:"●",quest:"중단 공격로 퀘스트",desc:"완료 시 2단계 장화를 대응하는 3단계 장화로 무료 업그레이드. 5분마다 4초 강화 귀환.",effects:["2단계 장화→3단계","4초 강화 귀환","처치 관여 시 귀환 쿨 -1분"]},
 {key:"bot",name:"원딜",icon:"▶",quest:"하단 공격로 퀘스트",desc:"완료 시 +300골드, 미니언 +2골드, 처치 관여 +50골드. 장화가 퀘스트 슬롯으로 이동해 7번째 아이템 칸 개방.",effects:["+300G","미니언 +2G","처치 관여 +50G","7번째 아이템 칸"]},
 {key:"support",name:"서폿",icon:"✚",quest:"서포터 퀘스트",desc:"완료 시 제어 와드 가격 40골드. 제어 와드 최대 2개를 포지션 퀘스트 슬롯에 보관.",effects:["제어 와드 40G","제어 와드 2개 퀘스트 슬롯"]}
];

const DRAGONS={
 infernal:{name:"화염",short:"화염",per:3,desc:"AD/AP +3%/스택"},
 mountain:{name:"대지",short:"대지",per:5,desc:"방어력/MR +5%/스택"},
 ocean:{name:"바다",short:"바다",per:2,desc:"5초마다 잃은 체력 2% 회복/스택"},
 cloud:{name:"구름",short:"구름",per:5,desc:"둔화 저항 + 비전투 이동속도 5%/스택"},
 hextech:{name:"마법공학",short:"마공",per:5,desc:"스킬가속 +5, 공격속도 +5%/스택"},
 chemtech:{name:"화공",short:"화공",per:6,desc:"강인함·회복/보호막 효과 +6%/스택"}
};

const MID_BOOT_UPGRADES={
 "명석함의 아이오니아 장화":{name:"핏빛 명석함",stats:{abilityHaste:20,ms:45},desc:"소환사 주문 가속 20, 조건 충족 시 이동속도 증가"},
 "신속의 장화":{name:"신속행진",stats:{ms:65},desc:"둔화 효과 40% 감소, 이동속도 기반 적응형 능력치"},
 "마법사의 신발":{name:"주문투척자의 신발",stats:{ms:45,magicPenFlat:18,magicPenPct:8},desc:"마법 관통력 18 + 8%"},
 "광전사의 군화":{name:"건메탈 군화",stats:{asPct:40,ms:45,lifesteal:5},desc:"공격속도 40%, 생명력 흡수 5%"},
 "헤르메스의 발걸음":{name:"사슬끈 분쇄자",stats:{mr:30,ms:45},desc:"마법 피해 후 마법 보호막"},
 "판금 장화":{name:"무장 진격",stats:{armor:35,ms:45},desc:"기본 공격 피해 10% 감소, 물리 피해 후 물리 보호막"}
};

const state={
 teams:{ally:[null,null,null,null,null],enemy:[null,null,null,null,null]},
 builds:{},focus:null,pickerMode:null,pickerTarget:null,
 dragons:{
   ally:{infernal:0,mountain:0,ocean:0,cloud:0,hextech:0,chemtech:0},
   enemy:{infernal:0,mountain:0,ocean:0,cloud:0,hextech:0,chemtech:0}
 }
};

const buildKey=(side,index)=>`${side}:${index}`;
function ensureBuild(side,index){
 const k=buildKey(side,index);
 if(!state.builds[k])state.builds[k]={level:1,items:[null,null,null,null,null,null],rune:null,skillRanks:{},questDone:false};
 return state.builds[k]
}
function currentBuild(){return state.focus?ensureBuild(state.focus.side,state.focus.index):null}
function currentRole(){return state.focus?ROLES[state.focus.index]:null}

function setPatch(p){
 patch=p;$("patchLabel").textContent=`패치 ${p.display} · 내부 ${p.dataVersion}${p.isDemo?" · 데모":""}`;
 state.teams={ally:[null,null,null,null,null],enemy:[null,null,null,null,null]};state.builds={};state.focus=null;
 state.dragons={ally:{infernal:0,mountain:0,ocean:0,cloud:0,hextech:0,chemtech:0},enemy:{infernal:0,mountain:0,ocean:0,cloud:0,hextech:0,chemtech:0}};
 renderAll()
}
function setupPatchSelect(){
 $("patchSelect").innerHTML="";CATALOG.patches.forEach((p,i)=>{const o=document.createElement("option");o.value=i;o.textContent=`패치 ${p.display}`;$("patchSelect").appendChild(o)});
 $("patchSelect").onchange=e=>setPatch(CATALOG.patches[Number(e.target.value)])
}
function champImg(ch){return `https://ddragon.leagueoflegends.com/cdn/${patch.assetVersion}/img/champion/${ch.image.full}`}
function itemImg(it){return `https://ddragon.leagueoflegends.com/cdn/${patch.assetVersion}/img/item/${it.image.full}`}
function runeImg(r){return `https://ddragon.leagueoflegends.com/cdn/img/${r.icon}`}
function spellImg(s){return `https://ddragon.leagueoflegends.com/cdn/${patch.assetVersion}/img/spell/${s.image.full}`}

function renderAll(){renderTeam("ally");renderTeam("enemy");renderDragons("ally");renderDragons("enemy");renderEditor()}
function renderTeam(side){
 const root=side==="ally"?$("allySlots"):$("enemySlots");root.innerHTML="";
 state.teams[side].forEach((ch,index)=>{
  const b=document.createElement("button");b.className="champ-slot"+(!ch?" empty":"")+(state.focus?.side===side&&state.focus?.index===index?" focused":"");
  if(ch){const img=document.createElement("img");img.src=champImg(ch);img.alt=ch.name;b.appendChild(img);b.onclick=()=>{state.focus={side,index};ensureBuild(side,index);renderAll()};b.oncontextmenu=e=>{e.preventDefault();openChampionPicker(side,index)};let t;b.ontouchstart=()=>t=setTimeout(()=>openChampionPicker(side,index),550);b.ontouchend=()=>clearTimeout(t)}
  else b.onclick=()=>openChampionPicker(side,index);
  root.appendChild(b)
 })
}
function totalDragons(side){return Object.values(state.dragons[side]).reduce((a,b)=>a+b,0)}
function renderDragons(side){
 const root=side==="ally"?$("allyDragons"):$("enemyDragons");root.innerHTML="";
 Object.entries(DRAGONS).forEach(([key,d])=>{
   const n=state.dragons[side][key];
   const box=document.createElement("div");box.className="dragon-chip";
   box.innerHTML=`<div class="dragon-name">${d.name}</div><div class="dragon-controls"><button data-act="minus">−</button><span class="dragon-count">${n}</span><button data-act="plus">+</button></div><div class="eyebrow" style="margin-top:6px">${d.desc}</div>`;
   box.querySelector('[data-act="minus"]').onclick=()=>{if(state.dragons[side][key]>0){state.dragons[side][key]--;renderAll()}};
   box.querySelector('[data-act="plus"]').onclick=()=>{if(totalDragons(side)<4){state.dragons[side][key]++;renderAll()}};
   root.appendChild(box)
 });
 const s=dragonSummary(side);
 (side==="ally"?$("allyDragonBuffs"):$("enemyDragonBuffs")).textContent=`총 ${totalDragons(side)}스택 · ${s}`;
}
function dragonSummary(side){
 const d=state.dragons[side],bits=[];
 if(d.infernal)bits.push(`AD/AP +${d.infernal*3}%`);
 if(d.mountain)bits.push(`방어/MR +${d.mountain*5}%`);
 if(d.hextech)bits.push(`AS +${d.hextech*5}%, AH +${d.hextech*5}`);
 if(d.cloud)bits.push(`비전투 MS·둔화저항 +${d.cloud*5}%`);
 if(d.ocean)bits.push(`잃은 체력 회복 ${d.ocean*2}%/5초`);
 if(d.chemtech)bits.push(`강인함·회복/보호막 +${d.chemtech*6}%`);
 return bits.length?bits.join(" · "):"드래곤 없음"
}

function openChampionPicker(side,index){state.pickerMode="champion";state.pickerTarget={side,index};$("dialogTitle").textContent="챔피언 선택";$("dialogEyebrow").textContent=`${ROLES[index].name} · ${side==="ally"?"우리 팀":"상대 팀"}`;$("pickerSearch").value="";renderPicker("");$("pickerDialog").showModal()}
function openItemPicker(slot){state.pickerMode="item";state.pickerTarget={slot};$("dialogTitle").textContent="아이템 선택";$("dialogEyebrow").textContent=`슬롯 ${slot+1}`;$("pickerSearch").value="";renderPicker("");$("pickerDialog").showModal()}
function openRunePicker(){state.pickerMode="rune";state.pickerTarget=null;$("dialogTitle").textContent="룬 선택";$("dialogEyebrow").textContent="룬";$("pickerSearch").value="";renderPicker("");$("pickerDialog").showModal()}
function renderPicker(q){
 q=q.trim().toLowerCase();let rows=state.pickerMode==="champion"?patch.champions:state.pickerMode==="item"?patch.items:patch.runes;
 rows=rows.filter(x=>(x.name||"").toLowerCase().includes(q));const grid=$("pickerGrid");grid.innerHTML="";
 rows.forEach(x=>{const b=document.createElement("button");b.type="button";b.className="pick";const img=document.createElement("img");img.src=state.pickerMode==="champion"?champImg(x):state.pickerMode==="item"?itemImg(x):runeImg(x);img.alt=x.name;const s=document.createElement("span");s.textContent=x.name;b.append(img,s);
 b.onclick=()=>{if(state.pickerMode==="champion"){const{side,index}=state.pickerTarget;state.teams[side][index]=x;state.builds[buildKey(side,index)]={level:1,items:[null,null,null,null,null,null],rune:null,skillRanks:{},questDone:false};state.focus={side,index}}
 else if(state.pickerMode==="item")currentBuild().items[state.pickerTarget.slot]=x;else currentBuild().rune=x;$("pickerDialog").close();renderAll()};grid.appendChild(b)})
}
function focusedChampion(){return state.focus?state.teams[state.focus.side][state.focus.index]:null}
function levelStat(base,growth,l){if(l<=1)return base;const n=l-1;return base+growth*n*(0.7025+0.0175*n)}
function getEffectiveItems(build,role){
 let arr=build.items.filter(Boolean).map(x=>({item:x,upgrade:null}));
 if(role.key==="mid"&&build.questDone){
   arr=arr.map(x=>MID_BOOT_UPGRADES[x.item.name]?{item:x.item,upgrade:MID_BOOT_UPGRADES[x.item.name]}:x)
 }
 return arr
}
function statsFor(ch,build,side,index){
 const s=ch.stats,l=build.level,role=ROLES[index];
 const base={hp:levelStat(s.hp,s.hpperlevel,l),mp:levelStat(s.mp,s.mpperlevel,l),ad:levelStat(s.attackdamage,s.attackdamageperlevel,l),armor:levelStat(s.armor,s.armorperlevel,l),mr:levelStat(s.spellblock,s.spellblockperlevel,l),as:s.attackspeed*(1+(s.attackspeedperlevel/100)*(l-1)*(0.7025+0.0175*(l-1))),ms:s.movespeed,crit:(s.crit||0)*100,ap:0,abilityHaste:0,tenacity:0,healShieldPower:0,slowResist:0,oocMsPct:0,oceanRegen:0,jungleMsPct:0,jungleOocMsPct:0};
 const out={...base};
 getEffectiveItems(build,role).forEach(({item,upgrade})=>{
   const st=item.stats||{};out.hp+=st.FlatHPPoolMod||0;out.mp+=st.FlatMPPoolMod||0;out.ad+=st.FlatPhysicalDamageMod||0;out.ap+=st.FlatMagicDamageMod||0;out.armor+=st.FlatArmorMod||0;out.mr+=st.FlatSpellBlockMod||0;out.ms+=st.FlatMovementSpeedMod||0;out.as*=1+(st.PercentAttackSpeedMod||0);out.crit+=(st.FlatCritChanceMod||0)*100;
   if(upgrade){
     // Replace common tier-2 boot headline stats with known tier-3 headline values.
     if(upgrade.stats.ms!=null) out.ms += upgrade.stats.ms-(st.FlatMovementSpeedMod||0);
     if(upgrade.stats.armor!=null) out.armor += upgrade.stats.armor-(st.FlatArmorMod||0);
     if(upgrade.stats.mr!=null) out.mr += upgrade.stats.mr-(st.FlatSpellBlockMod||0);
     if(upgrade.stats.asPct!=null){ const old=(st.PercentAttackSpeedMod||0)*100; out.as*= (1+upgrade.stats.asPct/100)/(1+old/100); }
     if(upgrade.stats.abilityHaste!=null) out.abilityHaste+=upgrade.stats.abilityHaste;
   }
 });
 const dg=state.dragons[side];
 out.ad*=1+0.03*dg.infernal;out.ap*=1+0.03*dg.infernal;
 out.armor*=1+0.05*dg.mountain;out.mr*=1+0.05*dg.mountain;
 out.as*=1+0.05*dg.hextech;out.abilityHaste+=5*dg.hextech;
 out.oocMsPct+=5*dg.cloud;out.slowResist+=5*dg.cloud;
 out.oceanRegen+=2*dg.ocean;out.tenacity+=6*dg.chemtech;out.healShieldPower+=6*dg.chemtech;
 if(role.key==="jungle"&&build.questDone){out.jungleMsPct+=4;out.jungleOocMsPct+=8}
 return {base,out}
}
function targetForDamage(){
 if(!state.focus)return null;const other=state.focus.side==="ally"?"enemy":"ally";const idx=state.teams[other].findIndex(Boolean);if(idx<0)return null;
 const ch=state.teams[other][idx],b=ensureBuild(other,idx);return{ch,b,stats:statsFor(ch,b,other,idx).out}
}
function mitigation(raw,resist){return resist>=0?raw*100/(100+resist):raw*(2-100/(100-resist))}
function estimateSpell(spell,rank,attacker,target){
 let base=null;const eb=spell.effectBurn||[];
 for(let i=1;i<eb.length;i++){const v=eb[i];if(Array.isArray(v)){const n=Number(v[Math.max(0,rank-1)]);if(Number.isFinite(n)&&n>0){base=n;break}}else if(typeof v==="string"&&v.includes("/")){const a=v.split("/").map(Number),n=a[rank-1];if(Number.isFinite(n)&&n>0){base=n;break}}}
 if(base===null)return null;let raw=base;(spell.vars||[]).forEach(v=>{const c=Array.isArray(v.coeff)?Number(v.coeff[Math.min(rank-1,v.coeff.length-1)]):Number(v.coeff);if(!Number.isFinite(c))return;const link=(v.link||"").toLowerCase();if(link.includes("attackdamage"))raw+=c*attacker.ad;else if(link.includes("spelldamage")||link.includes("abilitypower"))raw+=c*attacker.ap});
 const magic=/마법 피해|magic damage/i.test(cleanHTML(spell.description||spell.tooltip||""));return{raw,after:target?mitigation(raw,magic?target.mr:target.armor):raw,magic}
}
function renderQuest(role,b){
 $("questName").textContent=`${role.icon} ${role.quest}`;$("questDesc").textContent=role.desc;
 $("questToggleBtn").textContent=b.questDone?"완료 적용 중 ✓":"퀘스트 완료";$("questToggleBtn").className="ghost";
 $("questEffects").innerHTML=role.effects.map(x=>`<span class="effect-pill ${b.questDone?"active":""}">${x}</span>`).join("")
}
function itemSlotCount(role,b){return role.key==="bot"&&b.questDone?7:6}
function renderEditor(){
 const ch=focusedChampion();$("editorCard").hidden=!ch;if(!ch)return;const b=currentBuild(),role=currentRole();
 const maxLevel=role.key==="top"&&b.questDone?20:18;if(b.level>maxLevel)b.level=maxLevel;
 $("levelRange").max=maxLevel;$("levelRange").value=b.level;$("levelValue").textContent=`${b.level} / ${maxLevel}`;
 $("focusedChampionImage").src=champImg(ch);$("focusedChampionName").textContent=`${ch.name} · ${role.name}`;$("focusedChampionTitle").textContent=ch.title||"";renderQuest(role,b);
 // inventory size migration
 const targetSlots=itemSlotCount(role,b);while(b.items.length<targetSlots)b.items.push(null);if(b.items.length>targetSlots)b.items=b.items.slice(0,targetSlots);
 const {base,out}=statsFor(ch,b,state.focus.side,state.focus.index);out.baseAd=base.ad;
 const list=[["체력",out.hp,base.hp,0],["마나/자원",out.mp,base.mp,0],["공격력",out.ad,base.ad,1],["주문력",out.ap,base.ap,0],["방어력",out.armor,base.armor,1],["마법저항력",out.mr,base.mr,1],["공격속도",out.as,base.as,3],["이동속도",out.ms,base.ms,0],["스킬가속",out.abilityHaste,0,0],["강인함",out.tenacity,0,0],["회복/보호막",out.healShieldPower,0,0],["둔화저항",out.slowResist,0,0]];
 $("statsGrid").innerHTML=list.map(([l,v,ba,d])=>`<div class="stat"><div class="label">${l}</div><div class="value">${fmt(v,d)}${["강인함","회복/보호막","둔화저항"].includes(l)?"%":""}</div><div class="delta">${Math.abs(v-ba)>.001?`보너스 ${v-ba>0?"+":""}${fmt(v-ba,d)}`:"기본/없음"}</div></div>`).join("");
 const slots=$("itemSlots");slots.innerHTML="";b.items.forEach((it,i)=>{const btn=document.createElement("button");btn.className="item-slot"+(!it?" empty":"");if(it){const im=document.createElement("img");im.src=itemImg(it);btn.appendChild(im)}btn.onclick=()=>openItemPicker(i);slots.appendChild(btn)});
 if(role.key==="bot"&&b.questDone){const note=document.createElement("div");note.className="inventory-note";note.textContent="원딜 퀘스트 완료: 장화는 포지션 퀘스트 슬롯으로 이동하는 것으로 간주하며 7번째 아이템 칸이 열렸습니다.";slots.after(note)}
 const r=$("selectedRune");if(!b.rune){r.className="selected-rune empty";r.textContent="선택된 룬 없음"}else{r.className="selected-rune";r.innerHTML=`<img src="${runeImg(b.rune)}"><div><strong>${b.rune.name}</strong><p>${b.rune.treeName||""} · ${cleanHTML(b.rune.longDesc||b.rune.shortDesc||"")}</p></div>`}
 $("itemDetails").innerHTML=getEffectiveItems(b,role).map(({item,upgrade})=>`<article class="detail"><div class="detail-head"><img src="${itemImg(item)}"><div><strong>${upgrade?`${item.name} → ${upgrade.name}`:item.name}</strong><div class="eyebrow">${item.gold?.total||0} 골드${upgrade?" · 미드 퀘스트 업그레이드":""}</div></div></div><p>${upgrade?upgrade.desc:cleanHTML(item.description||"")}</p></article>`).join("")||`<div class="selected-rune empty">아이템을 선택하면 표시됩니다.</div>`;
 const derived=[];
 if(out.oocMsPct)derived.push(`구름 드래곤: 비전투 이동속도 +${out.oocMsPct}%`);
 if(out.oceanRegen)derived.push(`바다 드래곤: 5초마다 잃은 체력 ${out.oceanRegen}% 회복`);
 if(out.jungleMsPct)derived.push(`정글 퀘스트: 정글/강가 이동속도 +${out.jungleMsPct}%, 비전투 +${out.jungleOocMsPct}%`);
 if(derived.length)$("itemDetails").insertAdjacentHTML("afterbegin",`<div class="detail"><strong>상황형 보너스</strong><p>${derived.join(" · ")}</p></div>`);
 renderSkills(ch,b,out)
}
function renderSkills(ch,b,attacker){
 const root=$("skillGrid");root.innerHTML="",target=targetForDamage();
 (ch.spells||[]).forEach((sp,idx)=>{const maxRank=sp.maxrank||5,rank=Math.min(maxRank,b.skillRanks[idx]||1);b.skillRanks[idx]=rank;const est=estimateSpell(sp,rank,attacker,target?.stats);const box=document.createElement("article");box.className="skill";
 box.innerHTML=`<div class="skill-head"><img src="${spellImg(sp)}"><div><strong>${["Q","W","E","R"][idx]||"스킬"} · ${sp.name}</strong><p>${cleanHTML(sp.description||sp.tooltip||"")}</p></div></div><div class="skill-controls"><label>스킬 레벨 <select data-skill="${idx}">${Array.from({length:maxRank},(_,i)=>`<option value="${i+1}" ${i+1===rank?"selected":""}>${i+1}</option>`).join("")}</select></label></div><div class="damage-box">${est?`추정 원시 피해 <strong>${fmt(est.raw,1)}</strong>${target?` · 첫 상대 챔피언 적용 후 <strong>${fmt(est.after,1)}</strong>`:""}`:`이 스킬은 현재 구조화 데이터만으로 신뢰성 있는 피해 계산이 어려워 설명만 표시합니다.`}</div>`;
 root.appendChild(box)});root.querySelectorAll("select[data-skill]").forEach(sel=>sel.onchange=e=>{b.skillRanks[Number(e.target.dataset.skill)]=Number(e.target.value);renderEditor()})
}
$("levelRange").oninput=e=>{currentBuild().level=Number(e.target.value);renderEditor()};
$("pickerSearch").oninput=e=>renderPicker(e.target.value);
$("clearItemsBtn").onclick=()=>{const n=itemSlotCount(currentRole(),currentBuild());currentBuild().items=Array(n).fill(null);renderEditor()};
$("pickRuneBtn").onclick=openRunePicker;
$("questToggleBtn").onclick=()=>{const b=currentBuild();b.questDone=!b.questDone;renderEditor()};
setupPatchSelect();setPatch(patch);
