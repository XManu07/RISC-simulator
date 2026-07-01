export interface ExecutionConfig {
  schedulingMode?: 'tomasulo' | 'scoreboard'
  issueWidth: number
  rsPerClass: number
  robSize: number
  prefetchBufferSize: number
  speculation: boolean
  branchPredictor: 'always-taken' | 'one-bit' | 'two-bit'
  cdbCount: number
  units: { alu: number; mul: number; ldst: number; jmp: number }
  latencies: { alu: number; mul: number; ldst: number; jmp: number }
}

export const defaultExecutionConfig: ExecutionConfig = {
  issueWidth: 1,
  rsPerClass: 4,
  robSize: 8,
  prefetchBufferSize: 4,
  speculation: false,
  branchPredictor: 'two-bit',
  cdbCount: 1,
  units: { alu: 2, mul: 1, ldst: 1, jmp: 1 },
  latencies: { alu: 1, mul: 4, ldst: 1, jmp: 1 },
}
