export function calculateRankTitle(currentBaths: number): string {
  if (currentBaths === 0) {
    return "Tørrdokker";
  } else if (currentBaths >= 1 && currentBaths <= 5) {
    return "Ferskvannskadett";
  } else if (currentBaths >= 6 && currentBaths <= 10) {
    return "Sjøulkaspirant";
  } else if (currentBaths >= 11 && currentBaths <= 20) {
    return "Badeengel";
  } else if (currentBaths >= 21 && currentBaths <= 30) {
    return "Vannglad Viking";
  } else if (currentBaths >= 31 && currentBaths <= 50) {
    return "Polarplasker";
  } else {
    return "Legendarisk Havhest";
  }
}
