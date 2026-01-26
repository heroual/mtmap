
/**
 * Professional Optical Link Budget Calculator
 * Based on ITU-T G.652 standards and typical field values.
 */

export const OpticalConstants = {
  ATTENUATION_1310: 0.35, // dB/km (Standard G.652)
  ATTENUATION_1550: 0.22, // dB/km
  CONNECTOR_LOSS: 0.5,    // dB (SC/APC max insertion loss)
  SPLICE_LOSS: 0.1,       // dB (Fusion splice)
  MECH_SPLICE_LOSS: 0.2,  // dB (Mechanical splice)
  SAFETY_MARGIN: 3.0,     // dB (Network design margin)
};

export const SplitterLosses: Record<string, number> = {
  "1:2": 3.7,
  "1:4": 7.3,
  "1:8": 10.5,
  "1:16": 13.7,
  "1:32": 17.1,
  "1:64": 20.5,
  "2:2": 4.0,
  "2:4": 7.6,
  "2:8": 10.9,
  "2:16": 14.1,
  "2:32": 17.5
};

export interface LinkBudgetDetails {
  fiberLoss: number;
  connectorLoss: number;
  spliceLoss: number;
  passiveLoss: number; // Splitters etc.
  totalLoss: number;
}

export const OpticalCalculator = {
  
  /**
   * Calculate attenuation of the fiber glass itself
   */
  calculateFiberLoss: (meters: number, wavelength: '1310' | '1550' = '1310'): number => {
    const rate = wavelength === '1310' ? OpticalConstants.ATTENUATION_1310 : OpticalConstants.ATTENUATION_1550;
    return parseFloat(((meters / 1000) * rate).toFixed(3));
  },
  
  /**
   * Get Standard Insertion Loss for Splitters
   */
  getSplitterLoss: (ratio: string): number => {
    return SplitterLosses[ratio] || 0;
  },

  /**
   * Calculate Total Link Budget
   */
  calculateLinkBudget: (params: { 
    distanceMeters: number, 
    connectorCount: number, 
    spliceCount: number, 
    splitters?: string[],
    wavelength?: '1310' | '1550'
  }): LinkBudgetDetails => {
    const fiberLoss = OpticalCalculator.calculateFiberLoss(params.distanceMeters, params.wavelength);
    const connectorLoss = params.connectorCount * OpticalConstants.CONNECTOR_LOSS;
    const spliceLoss = params.spliceCount * OpticalConstants.SPLICE_LOSS;
    
    let passiveLoss = 0;
    if (params.splitters) {
      params.splitters.forEach(r => passiveLoss += OpticalCalculator.getSplitterLoss(r));
    }

    const totalLoss = parseFloat((fiberLoss + connectorLoss + spliceLoss + passiveLoss).toFixed(2));

    return {
      fiberLoss,
      connectorLoss,
      spliceLoss,
      passiveLoss,
      totalLoss
    };
  }
};
