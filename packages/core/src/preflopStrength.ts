import { comboCount, type HandClass } from './ranges';

/**
 * Every starting hand's share of the pot against one random hand, all in
 * preflop, best first. Computed with Suited's own evaluator by sampling
 * 30,000 deals per hand (seed 12345), so each value is within about 0.3
 * points. Play's bots use the order where no chart covers a spot. It is a
 * rough guide to hand strength and is recomputed in preflopStrength.test.ts.
 */
const TABLE = [
  'AA:0.852', 'KK:0.822', 'QQ:0.800', 'JJ:0.775', 'TT:0.746', '99:0.721', '88:0.691', 'AKs:0.674', 'AQs:0.667', '77:0.663',
  'AKo:0.655', 'AJs:0.653', 'AQo:0.646', 'ATs:0.644', '66:0.637', 'AJo:0.637', 'KQs:0.636', 'A9s:0.629', 'ATo:0.626', 'A8s:0.622',
  'KJs:0.621', 'KTs:0.618', 'KQo:0.618', 'A7s:0.608', 'A9o:0.605', 'KJo:0.604', 'A6s:0.603', '55:0.602', 'A5s:0.598', 'QJs:0.598',
  'K9s:0.598', 'A8o:0.596', 'KTo:0.596', 'QTs:0.595', 'A4s:0.590', 'A7o:0.590', 'A3s:0.585', 'K8s:0.584', 'Q9s:0.582', 'K7s:0.580',
  'K9o:0.577', 'QJo:0.576', 'A6o:0.575', 'JTs:0.575', 'A2s:0.573', 'QTo:0.572', 'A5o:0.572', '44:0.571', 'K6s:0.569', 'A4o:0.563',
  'Q8s:0.560', 'A3o:0.558', 'K8o:0.558', 'K5s:0.556', 'Q9o:0.556', 'J9s:0.554', 'K7o:0.552', 'A2o:0.552', 'JTo:0.551', 'K4s:0.549',
  'Q7s:0.547', 'K6o:0.547', 'T9s:0.544', 'J8s:0.541', '33:0.537', 'K5o:0.536', 'K3s:0.535', 'Q6s:0.535', 'Q8o:0.533', 'Q5s:0.529',
  'K2s:0.528', 'J9o:0.527', 'T8s:0.526', 'J7s:0.525', 'K4o:0.522', 'Q7o:0.518', 'Q4s:0.517', 'T9o:0.517', 'K3o:0.516', 'J8o:0.515',
  'Q6o:0.514', 'Q3s:0.511', 'T7s:0.508', 'K2o:0.507', '22:0.505', '98s:0.505', 'J5s:0.504', 'T8o:0.500', 'J6s:0.499', 'Q5o:0.498',
  'Q2s:0.498', 'J7o:0.497', 'Q4o:0.493', '97s:0.493', 'T6s:0.490', 'J4s:0.490', 'Q3o:0.486', 'J6o:0.482', 'J3s:0.480', '98o:0.478',
  'T7o:0.478', '87s:0.478', 'J2s:0.477', 'Q2o:0.476', 'T5s:0.474', 'J5o:0.473', '96s:0.472', 'T4s:0.470', 'J4o:0.466', '97o:0.464',
  'T6o:0.464', '86s:0.462', 'T3s:0.456', '95s:0.455', 'T2s:0.452', '76s:0.451', 'J3o:0.449', '87o:0.448', '85s:0.446', 'T5o:0.444',
  'J2o:0.444', '94s:0.444', '96o:0.443', '75s:0.441', '65s:0.437', 'T4o:0.436', '86o:0.433', 'T3o:0.429', '84s:0.428', '93s:0.427',
  '95o:0.427', '92s:0.422', '76o:0.420', '74s:0.418', '83s:0.415', 'T2o:0.414', '54s:0.413', '64s:0.413', '85o:0.410', '65o:0.407',
  '75o:0.405', '94o:0.404', '82s:0.404', '93o:0.400', '73s:0.395', '53s:0.394', '84o:0.393', '92o:0.389', '74o:0.388', '63s:0.388',
  '54o:0.384', '64o:0.382', '43s:0.381', '72s:0.380', '62s:0.377', '52s:0.376', '42s:0.372', '83o:0.370', '82o:0.368', '73o:0.367',
  '53o:0.363', '32s:0.360', '63o:0.360', '43o:0.351', '52o:0.345', '72o:0.342', '62o:0.342', '42o:0.334', '32o:0.319',
];

export const HAND_STRENGTH_ORDER: { hand: HandClass; equity: number }[] = TABLE.map((t) => {
  const [hand, equity] = t.split(':');
  return { hand: hand as HandClass, equity: Number(equity) };
});

/** Combos strictly stronger than each hand, by the order above. */
const ABOVE = new Map<HandClass, number>();
let seen = 0;
for (const { hand } of HAND_STRENGTH_ORDER) {
  ABOVE.set(hand, seen);
  seen += comboCount(hand);
}

/** Share of the 1,326 starting combos stronger than this hand: 0 for AA, near 1 for 32o. */
export function preflopPercentile(hand: HandClass): number {
  const above = ABOVE.get(hand);
  if (above === undefined) throw new Error(`Unknown hand class ${hand}`);
  return above / 1326;
}
