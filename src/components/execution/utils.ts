export function hex(v: number, pad = 8): string {
  return '0x' + (v >>> 0).toString(16).toUpperCase().padStart(pad, '0')
}

export const CLASS_COLOR: Record<string, string> = {
  ALU: 'text-blue-300',
  MUL: 'text-purple-300',
  LDST: 'text-orange-300',
  JMP: 'text-yellow-300',
}
