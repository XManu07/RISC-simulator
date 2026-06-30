import type { Opcode, InstructionFormat } from '@core/contracts/instruction'
import { OPCODE_FORMAT } from './opcodes'
import { encode } from './encode'

// Parsează linii de forma:
//   "100h  ADD R9,R8,R7"
//   "104h  LD  R1,200h"
//   "108h  ST  R2,204h"
//   "10Ch  JMP 100h"
//   ";  comentariu" sau linie goală — ignorate
//
// Returnează Map<adresă, cuvânt32> pregătit pentru încărcat în memorie.
export function assemble(source: string): Map<number, number> {
  const result = new Map<number, number>()

  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith(';')) continue

    const parts = line.split(/\s+/)
    if (parts.length < 2) continue

    const address = parseHex(parts[0])
    const mnemonic = parts[1].toUpperCase() as Opcode
    const args = parts.slice(2).join('').split(',').map(s => s.trim())

    if (!(mnemonic in OPCODE_FORMAT)) continue
    const format: InstructionFormat = OPCODE_FORMAT[mnemonic]

    let word: number
    switch (format) {
      case 'RRR':
        word = encode({ opcode: mnemonic, format, rd: parseReg(args[0]), rs1: parseReg(args[1]), rs2: parseReg(args[2]) })
        break
      case 'RRI':
        word = encode({ opcode: mnemonic, format, rd: parseReg(args[0]), rs1: parseReg(args[1]), imm: parseHex(args[2]) })
        break
      case 'RM':
        word = encode({ opcode: mnemonic, format, rd: parseReg(args[0]), imm: parseHex(args[1]) })
        break
      case 'J':
        word = encode({ opcode: mnemonic, format, imm: parseHex(args[0]) })
        break
      default:
        continue
    }
    result.set(address, word)
  }

  return result
}

function parseReg(s: string): number {
  return parseInt(s.replace(/^R/i, ''), 10)
}

function parseHex(s: string): number {
  return parseInt(s.replace(/h$/i, ''), 16)
}
