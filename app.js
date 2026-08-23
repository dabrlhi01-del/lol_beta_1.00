
const SNAP = window.LOL_SNAPSHOT;
const state = {
  version: SNAP.version,
  champions: SNAP.champions || [],
  items: SNAP.items || [],
  runes: SNAP.runes || [],
  teams: { ally:[null,null,null,null,null], enemy:[null,null,null,null,null] },
  focus:null, level:1, selectedItems:[null,null,null,null,null,null], selectedRune:null,
  pickerMode:null, pickerTarget:null
};
const $ = id => document.getElementById(id);
const fmt = (n,d=0)=>Number(n).toLocaleString("ko-KR",{maximumFractionDigits:d});
const cleanHTML = (html="") => html.replace(/<br\s*\/?>/gi," ").replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim();

$("patchLabel").textContent = SNAP.isDemo
  ? `내장 데모 ${SNAP.version} · 자동 업데이트 전`
  : `내장 Data Dragon ${SNAP.version} · ${SNAP.locale}`;
$("dataModeNote").textContent = SNAP.isDemo
  ? "현재 ZIP에는 동작 확인용 최소 데이터가 들어 있습니다. GitHub Actions의 'Update Data Dragon snapshot'을 한 번 실행하면 최신 전체 챔피언·아이템·룬 데이터가 저장됩니다."
  : `현재 ${SNAP.version} 패치 스냅샷을 웹앱 내부에서 사용 중입니다. 앱 실행 중 Riot JSON 서버에 요청하지 않습니다.`;

function championImage(ch){
  const v = SNAP.assetVersion || SNAP.version.replace("-demo","");
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/champion/${ch.image.full}`;
}
function itemImage(item){
  const v = SNAP.assetVersion || SNAP.version.replace("-demo","");
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/item/${item.image.full}`;
}
function runeImage(r){ return `https://ddragon.leagueoflegends.com/cdn/img/${r.icon}`; }

function renderAll(){ renderTeam("ally"); renderTeam("enemy"); renderEditor(); }
function renderTeam(side){
  const root = side==="ally"?$("allySlots"):$("enemySlots"); root.innerHTML="";
  state.teams[side].forEach((ch,index)=>{
    const b=document.createElement("button");
    b.className="champ-slot"+(!ch?" empty":"")+(state.focus?.side===side&&state.focus?.index===index?" focused":"");
    if(ch){
      const img=document.createElement("img"); img.src=championImage(ch); img.alt=ch.name; b.appendChild(img);
      b.onclick=()=>{ state.focus={side,index}; renderAll(); };
      b.oncontextmenu=e=>{e.preventDefault();openChampionPicker(side,index)};
      let timer; b.ontouchstart=()=>timer=setTimeout(()=>openChampionPicker(side,index),550); b.ontouchend=()=>clearTimeout(timer);
    }else b.onclick=()=>openChampionPicker(side,index);
    root.appendChild(b);
  });
}
function openChampionPicker(side,index){
  state.pickerMode="champion"; state.pickerTarget={side,index};
  $("dialogEyebrow").textContent=side==="ally"?"우리 팀":"상대 팀"; $("dialogTitle").textContent="챔피언 선택";
  $("pickerSearch").value=""; renderPicker(""); $("pickerDialog").showModal();
}
function openItemPicker(slot){
  state.pickerMode="item"; state.pickerTarget={slot};
  $("dialogEyebrow").textContent=`아이템 슬롯 ${slot+1}`; $("dialogTitle").textContent="아이템 선택";
  $("pickerSearch").value=""; renderPicker(""); $("pickerDialog").showModal();
}
function openRunePicker(){
  state.pickerMode="rune"; state.pickerTarget=null;
  $("dialogEyebrow").textContent="룬"; $("dialogTitle").textContent="룬 선택";
  $("pickerSearch").value=""; renderPicker(""); $("pickerDialog").showModal();
}
function renderPicker(query){
  const q=query.trim().toLowerCase();
  let rows=state.pickerMode==="champion"?state.champions:state.pickerMode==="item"?state.items:state.runes;
  rows=rows.filter(x=>(x.name||"").toLowerCase().includes(q));
  const grid=$("pickerGrid"); grid.innerHTML="";
  rows.forEach(x=>{
    const b=document.createElement("button"); b.type="button"; b.className="pick";
    const img=document.createElement("img"); img.loading="lazy";
    img.src=state.pickerMode==="champion"?championImage(x):state.pickerMode==="item"?itemImage(x):runeImage(x);
    img.alt=x.name;
    const span=document.createElement("span"); span.textContent=x.name; b.append(img,span);
    b.onclick=()=>{
      if(state.pickerMode==="champion"){
        const {side,index}=state.pickerTarget; state.teams[side][index]=x; state.focus={side,index};
        state.selectedItems=[null,null,null,null,null,null]; state.selectedRune=null;
      } else if(state.pickerMode==="item") state.selectedItems[state.pickerTarget.slot]=x;
      else state.selectedRune=x;
      $("pickerDialog").close(); renderAll();
    };
    grid.appendChild(b);
  });
}
function getFocusedChampion(){return state.focus?state.teams[state.focus.side][state.focus.index]:null;}
function levelStat(base,growth,level){
  if(level<=1)return base;
  const n=level-1;
  return base+growth*n*(0.7025+0.0175*n);
}
function calculateStats(ch){
  const s=ch.stats,l=state.level;
  const base={
    hp:levelStat(s.hp,s.hpperlevel,l), mp:levelStat(s.mp,s.mpperlevel,l),
    ad:levelStat(s.attackdamage,s.attackdamageperlevel,l),
    armor:levelStat(s.armor,s.armorperlevel,l), mr:levelStat(s.spellblock,s.spellblockperlevel,l),
    as:s.attackspeed*(1+(s.attackspeedperlevel/100)*(l-1)*(0.7025+0.0175*(l-1))),
    ms:s.movespeed, crit:(s.crit||0)*100
  };
  const out={...base};
  state.selectedItems.filter(Boolean).forEach(item=>{
    const st=item.stats||{};
    out.hp+=st.FlatHPPoolMod||0; out.mp+=st.FlatMPPoolMod||0; out.ad+=st.FlatPhysicalDamageMod||0;
    out.armor+=st.FlatArmorMod||0; out.mr+=st.FlatSpellBlockMod||0; out.ms+=st.FlatMovementSpeedMod||0;
    out.as*=1+(st.PercentAttackSpeedMod||0); out.crit+=(st.FlatCritChanceMod||0)*100;
  });
  return {base,out};
}
function renderEditor(){
  const ch=getFocusedChampion(); $("editorCard").hidden=!ch; if(!ch)return;
  $("focusedChampionImage").src=championImage(ch); $("focusedChampionName").textContent=ch.name; $("focusedChampionTitle").textContent=ch.title||"";
  $("levelValue").textContent=state.level; $("levelRange").value=state.level;
  const {base,out}=calculateStats(ch);
  const stats=[["체력",out.hp,base.hp,0],["마나/자원",out.mp,base.mp,0],["공격력",out.ad,base.ad,1],["방어력",out.armor,base.armor,1],["마법저항력",out.mr,base.mr,1],["공격속도",out.as,base.as,3],["이동속도",out.ms,base.ms,0],["치명타",out.crit,base.crit,1]];
  $("statsGrid").innerHTML=stats.map(([label,val,b,d])=>{
    const delta=val-b,suffix=label==="치명타"?"%":"";
    return `<div class="stat"><div class="label">${label}</div><div class="value">${fmt(val,d)}${suffix}</div><div class="delta">${Math.abs(delta)>.0001?`아이템 ${delta>0?"+":""}${fmt(delta,d)}${suffix}`:"기본 능력치"}</div></div>`;
  }).join("");
  const slots=$("itemSlots"); slots.innerHTML="";
  state.selectedItems.forEach((item,i)=>{
    const b=document.createElement("button"); b.className="item-slot"+(!item?" empty":"");
    if(item){const img=document.createElement("img");img.src=itemImage(item);img.alt=item.name;b.appendChild(img)}
    b.onclick=()=>openItemPicker(i); slots.appendChild(b);
  });
  const rune=$("selectedRune");
  if(!state.selectedRune){rune.className="selected-rune empty";rune.textContent="선택된 룬 없음";}
  else{rune.className="selected-rune";rune.innerHTML=`<img src="${runeImage(state.selectedRune)}"><div><strong>${state.selectedRune.name}</strong><p>${state.selectedRune.treeName||""} · ${cleanHTML(state.selectedRune.longDesc||state.selectedRune.shortDesc||"")}</p></div>`;}
  const items=state.selectedItems.filter(Boolean);
  $("itemDetails").innerHTML=items.length?items.map(item=>`<article class="detail"><div class="detail-head"><img src="${itemImage(item)}"><div><strong>${item.name}</strong><div class="eyebrow">${item.gold?.total||0} 골드</div></div></div><p>${cleanHTML(item.description||"")}</p></article>`).join(""):`<div class="selected-rune empty">아이템을 선택하면 효과 설명이 여기에 표시됩니다.</div>`;
}
$("levelRange").addEventListener("input",e=>{state.level=Number(e.target.value);renderEditor()});
$("pickerSearch").addEventListener("input",e=>renderPicker(e.target.value));
$("clearItemsBtn").onclick=()=>{state.selectedItems=[null,null,null,null,null,null];renderEditor()};
$("pickRuneBtn").onclick=openRunePicker;
renderAll();
