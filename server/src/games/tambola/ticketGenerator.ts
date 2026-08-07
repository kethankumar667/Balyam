/**
/**
 * Generate a valid 3x9 Tambola ticket with 15 numbers (5 per row).
 * Returns a 3x9 2D array where 0 represents an empty cell.
 */
export function generateTambolaTicket(rng: () => number = Math.random): number[][] {
  const ticket: number[][] = Array.from({ length: 3 }, () => Array(9).fill(0));

  // Generate candidate numbers per column
  const colPools: number[][] = [
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
    [30, 31, 32, 33, 34, 35, 36, 37, 38, 39],
    [40, 41, 42, 43, 44, 45, 46, 47, 48, 49],
    [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
    [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],
    [70, 71, 72, 73, 74, 75, 76, 77, 78, 79],
    [80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90],
  ];

  // Distribute 15 numbers across 9 columns such that every column gets at least 1 number
  const counts = Array(9).fill(1); // 9 numbers assigned
  let remaining = 6; // 15 - 9 = 6 more numbers to assign

  while (remaining > 0) {
    const col = Math.floor(rng() * 9);
    if (counts[col] < 3) {
      counts[col]++;
      remaining--;
    }
  }

  // Pick random sorted numbers for each column
  const chosenPerCol: number[][] = counts.map((count, cIdx) => {
    const pool = [...colPools[cIdx]];
    const picked: number[] = [];
    for (let i = 0; i < count; i++) {
      const pIdx = Math.floor(rng() * pool.length);
      picked.push(pool.splice(pIdx, 1)[0]);
    }
    return picked.sort((a, b) => a - b);
  });

  // Assign numbers to rows such that each row gets exactly 5 numbers
  for (let c = 0; c < 9; c++) {
    const colNums = chosenPerCol[c];
    if (colNums.length === 3) {
      ticket[0][c] = colNums[0];
      ticket[1][c] = colNums[1];
      ticket[2][c] = colNums[2];
    } else if (colNums.length === 2) {
      // Pick 2 rows out of 3
      const rows = [0, 1, 2].sort(() => rng() - 0.5).slice(0, 2).sort((a, b) => a - b);
      ticket[rows[0]][c] = colNums[0];
      ticket[rows[1]][c] = colNums[1];
    } else {
      // Pick 1 row out of 3
      const r = Math.floor(rng() * 3);
      ticket[r][c] = colNums[0];
    }
  }

  // Ensure each row has exactly 5 numbers (balance if needed)
  for (let r = 0; r < 3; r++) {
    const rowNumsCount = ticket[r].filter((val) => val > 0).length;
    if (rowNumsCount !== 5) {
      // Fallback simple ticket generation for guaranteed balance
      return generateBalancedTicket(rng);
    }
  }

  return ticket;
}

function generateBalancedTicket(rng: () => number): number[][] {
  const ticket: number[][] = Array.from({ length: 3 }, () => Array(9).fill(0));
  for (let r = 0; r < 3; r++) {
    const cols = [0, 1, 2, 3, 4, 5, 6, 7, 8].sort(() => rng() - 0.5).slice(0, 5);
    for (const c of cols) {
      const min = c === 0 ? 1 : c * 10;
      const max = c === 8 ? 90 : c * 10 + 9;
      let val = Math.floor(rng() * (max - min + 1)) + min;
      while (ticket[0][c] === val || ticket[1][c] === val) val++;
      ticket[r][c] = val;
    }
  }
  return ticket;
}
