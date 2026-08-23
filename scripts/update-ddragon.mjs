import fs from "node:fs/promises";

const locale = "ko_KR";

console.log("=== LoL Data Dragon updater 시작 ===");

const versionsResponse = await fetch(
  "https://ddragon.leagueoflegends.com/api/versions.json"
);

if (!versionsResponse.ok) {
  throw new Error(
    `Data Dragon 버전 조회 실패: ${versionsResponse.status}`
  );
}

const allVersions = await versionsResponse.json();

console.log("최신 Data Dragon:", allVersions[0]);


// 최근 패치 10개 수집
const selectedVersions = [];
const seenPatches = new Set();

for (const version of allVersions) {

  const match = version.match(/^(\d+)\.(\d+)\./);

  if (!match) continue;

  const patchKey =
    `${match[1]}.${match[2]}`;

  if (seenPatches.has(patchKey)) {
    continue;
  }

  seenPatches.add(patchKey);

  selectedVersions.push(version);

  if (selectedVersions.length >= 10) {
    break;
  }
}


function getDisplayPatch(version) {

  const match =
    version.match(/^(\d+)\.(\d+)\./);

  if (!match) {
    return version;
  }

  const internalMajor =
    Number(match[1]);

  const patch =
    Number(match[2]);

  // Data Dragon 16.16.x → LoL 26.16
  return `${internalMajor + 10}.${patch}`;
}



function filterItems(itemData) {

  const result =
    Object.entries(itemData)
      .map(([id, item]) => ({
        id,
        ...item
      }))
      .filter((item) => {

        return (
          item.maps?.["11"] === true &&
          item.gold?.purchasable === true &&
          item.gold?.total > 0 &&
          item.hideFromAll !== true &&
          item.inStore !== false
        );

      });


  // 같은 이름 아이템 중복 제거
  const unique =
    new Map();


  for (const item of result) {

    const key =
      item.name
        .trim()
        .toLowerCase();


    const existing =
      unique.get(key);


    if (!existing) {

      unique.set(
        key,
        item
      );

      continue;
    }


    /*
      같은 이름이 여러 개라면
      일반적으로 더 작은 ID를 우선 사용
    */
    if (
      Number(item.id) <
      Number(existing.id)
    ) {

      unique.set(
        key,
        item
      );

    }

  }


  return [...unique.values()]
    .sort((a, b) =>
      a.name.localeCompare(
        b.name,
        "ko"
      )
    );

}



async function loadPatch(version) {

  console.log("");
  console.log(
    `--- ${version} 다운로드 시작 ---`
  );


  const base =
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/${locale}`;


  const championIndexResponse =
    await fetch(
      `${base}/champion.json`
    );


  if (!championIndexResponse.ok) {

    throw new Error(
      `${version} champion.json 실패`
    );

  }


  const championIndex =
    await championIndexResponse.json();


  const championList =
    Object.values(
      championIndex.data
    );


  console.log(
    `${version} 챔피언 인덱스:`,
    championList.length
  );


  /*
    Q/W/E/R 스킬 설명을 위해
    각 챔피언 상세 JSON 다운로드
  */

  const champions = [];


  for (
    let i = 0;
    i < championList.length;
    i += 15
  ) {

    const batch =
      championList.slice(
        i,
        i + 15
      );


    const results =
      await Promise.all(

        batch.map(
          async (champion) => {

            const response =
              await fetch(
                `${base}/champion/${champion.id}.json`
              );


            if (!response.ok) {

              throw new Error(
                `챔피언 상세 실패: ${champion.id}`
              );

            }


            const json =
              await response.json();


            return json.data[
              champion.id
            ];

          }
        )

      );


    champions.push(
      ...results
    );


    console.log(
      `${version}: ${champions.length}/${championList.length} 챔피언`
    );

  }



  const itemResponse =
    await fetch(
      `${base}/item.json`
    );


  if (!itemResponse.ok) {

    throw new Error(
      `${version} item.json 실패`
    );

  }


  const itemJson =
    await itemResponse.json();



  const runeResponse =
    await fetch(
      `${base}/runesReforged.json`
    );


  if (!runeResponse.ok) {

    throw new Error(
      `${version} runesReforged.json 실패`
    );

  }


  const runeJson =
    await runeResponse.json();



  const items =
    filterItems(
      itemJson.data
    );


  const runes =
    runeJson.flatMap(
      (tree) =>

        tree.slots.flatMap(
          (slot) =>

            slot.runes.map(
              (rune) => ({
                ...rune,
                treeName:
                  tree.name
              })
            )

        )

    );



  /*
    잘못된 데모 데이터가
    성공 처리되는 것 방지
  */

  if (champions.length < 150) {

    throw new Error(
      `챔피언 데이터가 너무 적습니다: ${champions.length}`
    );

  }


  if (items.length < 50) {

    throw new Error(
      `아이템 데이터가 너무 적습니다: ${items.length}`
    );

  }


  if (runes.length < 20) {

    throw new Error(
      `룬 데이터가 너무 적습니다: ${runes.length}`
    );

  }



  console.log(
    `${version} 완료`
  );

  console.log(
    `챔피언: ${champions.length}`
  );

  console.log(
    `아이템: ${items.length}`
  );

  console.log(
    `룬: ${runes.length}`
  );


  return {

    display:
      getDisplayPatch(version),

    dataVersion:
      version,

    assetVersion:
      version,

    locale,

    isDemo:
      false,

    champions:
      champions.sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            "ko"
          )
      ),

    items,

    runes

  };

}



const patches = [];


for (
  const version
  of selectedVersions
) {

  const patch =
    await loadPatch(
      version
    );


  patches.push(
    patch
  );

}



if (
  patches.length === 0
) {

  throw new Error(
    "저장할 패치가 없습니다."
  );

}



const catalog = {

  generatedAt:
    new Date().toISOString(),

  patches

};



await fs.mkdir(
  "data",
  {
    recursive: true
  }
);



const catalogJavascript =

  `window.LOL_PATCH_CATALOG=${JSON.stringify(catalog)};\n`;



await fs.writeFile(

  "data/catalog.js",

  catalogJavascript,

  "utf8"

);



const manifest = {

  generatedAt:
    catalog.generatedAt,

  patches:
    patches.map(
      (patch) => ({

        display:
          patch.display,

        dataVersion:
          patch.dataVersion,

        champions:
          patch.champions.length,

        items:
          patch.items.length,

        runes:
          patch.runes.length

      })
    )

};



await fs.writeFile(

  "data/manifest.json",

  JSON.stringify(
    manifest,
    null,
    2
  ),

  "utf8"

);



console.log("");
console.log(
  "=============================="
);

console.log(
  "Data Dragon catalog 생성 완료"
);

console.log(
  "패치 개수:",
  patches.length
);

console.log(
  "최신 패치:",
  patches[0].display
);

console.log(
  "최신 패치 챔피언:",
  patches[0].champions.length
);

console.log(
  "=============================="
);
