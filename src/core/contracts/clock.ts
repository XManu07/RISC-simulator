// Tact abstract — întreg ≥ 0, fără unitate de timp reală.
// Latențele (cache hit/miss, latența memoriei) se exprimă în tacte, nu în nanosecunde.
export type Tick = number

export type StageName = 'IF' | 'OF' | 'EX' | 'MEM' | 'WB'
