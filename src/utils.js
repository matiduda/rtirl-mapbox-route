export const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Inverse Linar Interpolation, get the fraction between `a` and `b` on which `v` resides.
 */
export const inverseLerp = (a, b, v) => (v - a) / (b - a);
