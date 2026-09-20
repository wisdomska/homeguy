/**
 * The floor-plan glyph. Ported from HomeGuy Web.dc.html:1193-1200.
 *
 * This is what a card shows when there is no photo, when data saver is on,
 * or when the connection is gone - which in this market is most of the
 * time. It is drawn from the unit type in the listing text, so the caption
 * says exactly that: "Layout from the listing text, not measured."
 *
 * It costs nothing: three divs and a border.
 */

import type { UnitType } from './types';

export interface PlanBlock {
  /** flex-grow */
  f: number;
  /** height as a percentage of the glyph box */
  h: string;
  label: string;
}

export function planFor(unitType: UnitType): PlanBlock[] {
  switch (unitType) {
    case 'chamber_and_hall_self_contain':
      return [
        { f: 1.7, h: '100%', label: 'Hall' },
        { f: 1.2, h: '100%', label: 'Chamber' },
        { f: 0.7, h: '48%', label: 'Bath' },
      ];
    case 'chamber_and_hall':
      return [
        { f: 1.7, h: '100%', label: 'Hall' },
        { f: 1.2, h: '100%', label: 'Chamber' },
      ];
    case 'single_room_self_contain':
    case 'self_contain_studio':
      return [
        { f: 2, h: '100%', label: 'Room' },
        { f: 0.7, h: '46%', label: 'Bath' },
      ];
    case 'single_room':
    case 'hostel_bed':
      return [{ f: 1, h: '100%', label: 'Room' }];
    case 'bedroom_1':
      return [
        { f: 1.6, h: '100%', label: 'Hall' },
        { f: 1.1, h: '100%', label: 'Bed' },
        { f: 0.7, h: '48%', label: 'Bath' },
      ];
    case 'bedroom_2':
      return [
        { f: 1.6, h: '100%', label: 'Hall' },
        { f: 1, h: '100%', label: 'Bed' },
        { f: 1, h: '72%', label: 'Bed' },
        { f: 0.7, h: '46%', label: 'Bath' },
      ];
    case 'bedroom_3':
    case 'bedroom_4_plus':
      return [
        { f: 1.6, h: '100%', label: 'Hall' },
        { f: 1, h: '100%', label: 'Bed' },
        { f: 1, h: '80%', label: 'Bed' },
        { f: 1, h: '64%', label: 'Bed' },
        { f: 0.7, h: '44%', label: 'Bath' },
      ];
    case 'boys_quarters':
    default:
      return [
        { f: 1, h: '100%', label: 'Room' },
        { f: 0.8, h: '60%', label: 'Bath' },
      ];
  }
}
