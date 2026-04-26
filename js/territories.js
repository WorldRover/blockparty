// FIPS code → state abbreviation (continental US only)
const FIPS_TO_STATE = {
  '01':'AL','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE',
  '12':'FL','13':'GA','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS',
  '21':'KY','22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN',
  '28':'MS','29':'MO','30':'MT','31':'NE','32':'NV','33':'NH','34':'NJ',
  '35':'NM','36':'NY','37':'NC','38':'ND','39':'OH','40':'OK','41':'OR',
  '42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT',
  '50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY'
};

// State → sovereignty sequence (simplified to whole-state level)
// Note: some states straddle historical boundaries (CO, WY, MT, MN);
// assigned to dominant/majority region.
const STATE_SOVEREIGNTY = {
  // Britain → USA (original colonies + Northwest Territory + SE territories)
  'ME':['Britain','USA'], 'NH':['Britain','USA'],
  // Vermont Republic: declared independence 1777, free state 14 years before joining the Union 1791
  'VT':['Britain','Vermont Republic','USA'],
  'MA':['Britain','USA'], 'RI':['Britain','USA'], 'CT':['Britain','USA'],
  'PA':['Britain','USA'], 'MD':['Britain','USA'], 'VA':['Britain','USA'],
  'WV':['Britain','USA'], 'NC':['Britain','USA'], 'SC':['Britain','USA'],
  'GA':['Britain','USA'], 'KY':['Britain','USA'], 'TN':['Britain','USA'],
  // France → Britain → USA (Old Northwest / pays des Illinois)
  // France had forts and settlers throughout the Great Lakes and Ohio Valley:
  // Fort Pontchartrain/Detroit (1701), Michilimackinac (1715), Vincennes (1732),
  // Fort de Chartres (1718). Ceded to Britain in the Treaty of Paris 1763.
  'OH':['France','Britain','USA'], 'IN':['France','Britain','USA'],
  'IL':['France','Britain','USA'], 'MI':['France','Britain','USA'],
  'WI':['France','Britain','USA'],
  'AL':['Britain','USA'], 'MS':['Britain','USA'],

  // Netherlands → Britain → USA (New Netherlands, 1614–1664)
  'NY':['Netherlands','Britain','USA'],
  'NJ':['Netherlands','Britain','USA'],

  // Sweden → Netherlands → Britain → USA (New Sweden, 1638–1655)
  'DE':['Sweden','Netherlands','Britain','USA'],

  // Spain → Britain → Spain → USA (Florida, ceded to Britain 1763, returned 1783, US 1821)
  'FL':['Spain','Britain','Spain','USA'],

  // France → Spain → France → USA (Louisiana Purchase, 1803)
  'LA':['France','Spain','France','USA'],
  'AR':['France','Spain','France','USA'],
  'MO':['France','Spain','France','USA'],
  'IA':['France','Spain','France','USA'],
  'MN':['France','Spain','France','USA'],  // western MN; eastern MN overridden below
  'ND':['France','Spain','France','USA'],
  'SD':['France','Spain','France','USA'],
  'NE':['France','Spain','France','USA'],
  'KS':['France','Spain','France','USA'],
  'OK':['France','Spain','France','USA'],
  'CO':['France','Spain','France','USA'],  // eastern plains; western CO overridden below
  'WY':['France','Spain','France','USA'],  // eastern majority; western WY overridden below
  'MT':['France','Spain','France','USA'],  // eastern majority; western MT overridden below

  // Spain → Mexico → Republic of Texas → USA
  'TX':['Spain','Mexico','Republic of Texas','USA'],

  // Spain → Mexico → USA (Mexican Cession 1848 + Gadsden Purchase 1853)
  // Note: California is split out below due to Bear Flag Republic
  'NV':['Spain','Mexico','USA'],
  // State of Deseret (1849–1851): Mormon settlers proposed a vast state; Congress refused,
  // created Utah Territory instead — but Deseret government operated during this window
  'UT':['Spain','Mexico','Deseret','USA'],
  'AZ':['Spain','Mexico','USA'],
  'NM':['Spain','Mexico','USA'],

  // Spain → Mexico → Bear Flag Republic → USA (California specifically)
  // Bear Flag Republic: June 14 – July 9, 1846
  'CA':['Spain','Mexico','Bear Flag Republic','USA'],

  // Spain+Russia → Britain+USA → USA (Oregon Country)
  // Spain had Pacific coast claims (Nootka Convention 1790), ceded via Adams–Onís (1819).
  // Russia claimed the coast to 51°N via the 1821 Ukase, ceded south of 54°40′N via the
  // Russo-American Convention (1824). Britain and USA then jointly occupied (1818–1846)
  // before sole US control via the Oregon Treaty.
  'OR':['Spain+Russia','Britain+USA','USA'],
  'WA':['Spain+Russia','Britain+USA','USA'],
  'ID':['Spain+Russia','Britain+USA','USA'],
};

// Human-readable info for each sequence key
const SEQUENCE_INFO = {
  'Britain→USA': {
    label: 'Britain → USA',
    desc: 'Original British colonies and trans-Appalachian territories. Became part of the United States via the Treaty of Paris (1783).'
  },
  'Britain→Vermont Republic→USA': {
    label: 'Britain → Vermont Republic → USA',
    desc: 'Vermont: After the Revolution, Vermont was claimed by both New York and New Hampshire. Settlers under Ethan Allen and the Green Mountain Boys declared the Vermont Republic in 1777 — the first US state to ban slavery. It operated as an independent republic for 14 years before being admitted to the Union in 1791 as the 14th state.'
  },
  'France→Britain→USA': {
    label: 'France → Britain → USA',
    desc: 'Old Northwest (pays des Illinois): France built an arc of forts and settlements through the Great Lakes and Ohio Valley — Fort Detroit (1701), Michilimackinac (1715), Fort de Chartres (1718), Fort Vincennes (1732). Britain won the entire region in the Seven Years\' War (Treaty of Paris 1763), then ceded it to the United States in 1783.'
  },
  'Netherlands→Britain→USA': {
    label: 'Netherlands → Britain → USA',
    desc: 'New Netherlands (1614–1664). The Dutch colony centered on the Hudson River was seized by Britain in the Second Anglo-Dutch War (1664), becoming New York and New Jersey.'
  },
  'Sweden→Netherlands→Britain→USA': {
    label: 'Sweden → Netherlands → Britain → USA',
    desc: 'New Sweden (1638–1655) on the Delaware River. Captured by the Dutch in 1655, then British in 1664. Now Delaware.'
  },
  'Spain→Britain→Spain→USA': {
    label: 'Spain → Britain → Spain → USA',
    desc: 'Florida / West Florida coast: Spanish from the 1500s, ceded to Britain in 1763 (Seven Years\' War), returned to Spain in 1783. East Florida was purchased via the Adams–Onís Treaty (1821). The coastal strips of present-day Alabama and Mississippi were seized by the United States from Spain in 1813 during the War of 1812.'
  },
  'Spain→Britain→Spain→Republic of West Florida→USA': {
    label: 'Spain → Britain → Spain → Republic of West Florida → USA',
    desc: 'Louisiana Florida Parishes: Spanish, ceded to Britain in 1763, returned to Spain in 1783. In 1810, American settlers in the region revolted and declared the Republic of West Florida — an independent republic that lasted 74 days before President Madison annexed it as part of the Louisiana Purchase claim.'
  },
  'France→Spain→France→USA': {
    label: 'France → Spain → France → USA',
    desc: 'Louisiana Purchase (1803). France ceded this vast central territory to Spain in 1762, Spain secretly returned it to France in 1800, and Napoleon sold it to the United States for $15 million.'
  },
  'Spain→Mexico→Republic of Texas→USA': {
    label: 'Spain → Mexico → Republic of Texas → USA',
    desc: 'Texas: Spanish province until Mexican independence (1821), won independence from Mexico as the Republic of Texas (1836), then annexed by the United States in 1845.'
  },
  'Spain→Mexico→Disputed→USA': {
    label: 'Spain → Mexico → Disputed → USA',
    desc: 'Nueces Strip: The territory between the Nueces River and the Rio Grande. The Republic of Texas declared the Rio Grande as its southern boundary in 1836; Mexico held the Nueces River as the border and maintained effective control. The dispute sparked the Mexican–American War in 1846. After the Treaty of Guadalupe Hidalgo (1848), the area became definitively part of Texas.'
  },
  'Spain→Mexico→USA': {
    label: 'Spain → Mexico → USA',
    desc: 'Mexican Cession (1848). Spanish then Mexican territory, ceded to the United States after the Mexican–American War (Treaty of Guadalupe Hidalgo). Includes the Gadsden Purchase strip (1853).'
  },
  'Spain→Mexico→Deseret→USA': {
    label: 'Spain → Mexico → Deseret → USA',
    desc: 'Utah: Spanish and Mexican territory, then claimed by Mormon settlers as the State of Deseret (1849–1851) — a vast proposed state stretching to the Pacific. Congress rejected statehood and created the far smaller Utah Territory in 1850. The Deseret government briefly co-existed with and then yielded to federal authority.'
  },
  'Spain→Mexico→Bear Flag Republic→USA': {
    label: 'Spain → Mexico → Bear Flag Republic → USA',
    desc: 'California: Spanish colony (Alta California), then Mexican territory. The Bear Flag Revolt (June 14, 1846) briefly established an independent republic before US forces raised the American flag on July 9, 1846. Became the 31st state in 1850.'
  },
  'Spain+Russia→Britain+USA→USA': {
    label: 'Spain+Russia → Britain+USA → USA',
    desc: 'Oregon Country: Spain claimed the Pacific coast via the Nootka Convention (1790); Russia reasserted claims via the 1821 Ukase, pushing south to 51°N. Both ceded their claims to the United States — Spain via the Adams–Onís Treaty (1819), Russia via the Russo-American Convention (1824). Britain and the US then jointly occupied the territory until the Oregon Treaty (1846) established the 49th parallel boundary.'
  },
  'Spain→Mexico→Republic of Texas→Unorganized→USA': {
    label: 'Spain → Mexico → Republic of Texas → Unorganized → USA',
    desc: 'Oklahoma Panhandle ("No Man\'s Land"): Claimed by the Republic of Texas, then surrendered in the Compromise of 1850. No US territory or state claimed jurisdiction for 40 years — residents had no government, courts, or legal title. Attached to Oklahoma Territory in 1890.'
  },
};

// Sub-state geographic overrides
// Called after we know which state a cell is in. Returns a sequence key string,
// or null to fall back to the state-level default.
function getSubstateKey(lon, lat, stateAbbr) {
  switch (stateAbbr) {

    case 'MN': {
      // Mississippi River runs from ~91.7°W at 43.5°N (Iowa border)
      // to ~95.5°W at 47.2°N (Lake Itasca, the source). East of river → Britain→USA.
      const mslon = -(91.7 + (Math.min(lat, 47.2) - 43.5) * 1.027);
      return lon > mslon ? 'Britain→USA' : 'France→Spain→France→USA';
    }

    case 'MT': {
      // Continental Divide: ~112°W at 44.5°N, ~114°W at 49°N
      // West of divide → Oregon Country
      const divide = -(112.0 + (lat - 44.5) * 0.44);
      return lon <= divide ? 'Spain+Russia→Britain+USA→USA' : null;
    }

    case 'WY': {
      // Continental Divide: ~107.5°W at 41°N, ~110.5°W at 45°N
      // West of divide → Oregon Country
      const divide = -(107.5 + (lat - 41.0) * 0.75);
      return lon <= divide ? 'Spain+Russia→Britain+USA→USA' : null;
    }

    case 'CO': {
      // Continental Divide is roughly 106°W; west of it → Mexican Cession
      return lon <= -106.0 ? 'Spain→Mexico→USA' : null;
    }

    case 'LA': {
      // Florida Parishes (east of the Mississippi River, south of 31°N) were West Florida,
      // not the Louisiana Purchase. The Republic of West Florida briefly held them in 1810
      // before Madison annexed them.
      // Approximate Mississippi longitude at this latitude: lon ≈ -(69.8 + 0.7 * lat)
      const missLon = -(69.8 + 0.7 * lat);
      if (lon > missLon && lat < 31.5) return 'Spain→Britain→Spain→Republic of West Florida→USA';
      return null;
    }

    case 'MS': {
      // Southern Mississippi coast was West Florida — seized from Spain by the US in 1813
      if (lat < 30.5) return 'Spain→Britain→Spain→USA';
      return null;
    }

    case 'AL': {
      // Mobile Bay coastal area was West Florida — seized from Spain by the US in 1813
      if (lat < 31.0) return 'Spain→Britain→Spain→USA';
      return null;
    }

    case 'TX': {
      // Nueces Strip: between the Nueces River and the Rio Grande.
      // The Republic of Texas claimed it as theirs (Rio Grande boundary) but Mexico
      // had effective control until the Mexican-American War (1848). Disputed zone.
      // Nueces River runs roughly from (27.8°N, 97.4°W) to (29.3°N, 99.8°W).
      const nuecesLine = Math.min(30.0, 27.8 - (lon + 97.4) * 0.625);
      if (lat < nuecesLine) return 'Spain→Mexico→Disputed→USA';
      return null;
    }

    case 'OK': {
      // Oklahoma Panhandle ("No Man's Land"): west of 100°W, 36.5–37°N
      // Distinct from Texas — Republic of Texas ceded it in 1850; no government 1850–1890
      if (lon <= -100.0) return 'Spain→Mexico→Republic of Texas→Unorganized→USA';
      return null;
    }

    default:
      return null;
  }
}

// Color palette — one per sequence, chosen for contrast and historical resonance
const SEQUENCE_COLORS = {
  'Britain→USA':                                            '#4e79a7',  // steel blue
  'Britain→Vermont Republic→USA':                           '#a8d8a8',  // sage green
  'France→Britain→USA':                                     '#7ab5d4',  // light blue (French Great Lakes)
  'Netherlands→Britain→USA':                                '#f28e2b',  // orange
  'Sweden→Netherlands→Britain→USA':                         '#edc948',  // yellow
  'Spain→Britain→Spain→USA':                                '#e15759',  // red (Florida + W. FL coast)
  'Spain→Britain→Spain→Republic of West Florida→USA':       '#d47a7a',  // rose (W. FL Republic)
  'France→Spain→France→USA':                                '#59a14f',  // green (Louisiana Purchase)
  'Spain→Mexico→Republic of Texas→USA':                     '#b07aa1',  // purple (Texas)
  'Spain→Mexico→Republic of Texas→Unorganized→USA':         '#7a4f6d',  // dark plum (No Man's Land)
  'Spain→Mexico→Disputed→USA':                              '#c98244',  // amber (Nueces Strip)
  'Spain→Mexico→USA':                                       '#76b7b2',  // teal (Mexican Cession)
  'Spain→Mexico→Deseret→USA':                               '#cc7a4a',  // desert rust (Utah)
  'Spain→Mexico→Bear Flag Republic→USA':                    '#e8a838',  // gold (Bear Flag / CA)
  'Spain+Russia→Britain+USA→USA':                           '#ff9da7',  // pink (Oregon Country)
};
