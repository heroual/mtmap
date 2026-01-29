
import { CableType } from '../types';

// The Immutable Color Order defined in requirements
export const STANDARD_COLORS = [
  { name: 'Blue', hex: '#0074D9', text: 'white' },    // 1
  { name: 'Orange', hex: '#FF851B', text: 'white' },  // 2
  { name: 'Green', hex: '#2ECC40', text: 'white' },   // 3
  { name: 'Brown', hex: '#8B572A', text: 'white' },   // 4
  { name: 'Grey', hex: '#AAAAAA', text: 'black' },    // 5
  { name: 'White', hex: '#FFFFFF', text: 'black', border: true }, // 6
  { name: 'Red', hex: '#FF4136', text: 'white' },     // 7
  { name: 'Black', hex: '#111111', text: 'white' }    // 8
];

export interface FiberStructure {
  fiberId: number;
  tubeId: number;
  tubeColor: typeof STANDARD_COLORS[0];
  fiberColor: typeof STANDARD_COLORS[0];
  structureType: string;
}

export const FiberStandards = {
  /**
   * Returns the color definition for a specific index (1-based)
   * Loops if index > 8
   */
  getColor: (index: number) => {
    // 1-based index to 0-based array
    const i = (index - 1) % 8;
    return STANDARD_COLORS[i];
  },

  /**
   * Calculates the Tube and Fiber colors based on Cable Type and Fiber Index
   */
  getStructure: (cableType: CableType | string, fiberIndex: number): FiberStructure => {
    let fibersPerTube = 12; // Default Standard TIA
    let structureName = 'Standard';

    // Apply Specific Rules from Requirements
    if (cableType === CableType.FO16 || cableType === 'FO16') {
      fibersPerTube = 4;
      structureName = 'FO16 (4x4)';
    } else if (cableType === CableType.FO24 || cableType === 'FO24') {
      fibersPerTube = 4;
      structureName = 'FO24 (6x4)';
    } else if (cableType === CableType.FO56 || cableType === 'FO56') {
      fibersPerTube = 8;
      structureName = 'FO56 (7x8)';
    } else if (['FO04', 'FO08', 'FO12'].includes(cableType)) {
       // Small cables usually 1 tube (Central Loose Tube)
       // Or standard color code directly on fibers
       fibersPerTube = 12; 
    }

    // Calculations (1-based)
    const tubeId = Math.ceil(fiberIndex / fibersPerTube);
    
    // Fiber index inside the tube (1-based)
    // Ex: Fiber 5 in 4-fiber-tube is Fiber 1 of Tube 2
    let fiberInTube = fiberIndex % fibersPerTube;
    if (fiberInTube === 0) fiberInTube = fibersPerTube;

    return {
      fiberId: fiberIndex,
      tubeId: tubeId,
      tubeColor: FiberStandards.getColor(tubeId),
      fiberColor: FiberStandards.getColor(fiberInTube),
      structureType: structureName
    };
  }
};
