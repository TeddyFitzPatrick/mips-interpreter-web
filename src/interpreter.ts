const MAX_REG_VALUE = Math.pow(2, 32) - 1;
export const BIN = 2, OCTAL = 8, DEC = 10, HEX = 16;

// Registers
export const registers: Uint32Array = new Uint32Array(32);
registers[31] = 3; // debug 
export const registerLabels: string[] = [
  "$zero", // 0
  "$at",   // 1 (reserved)
  "$v0",   // 2
  "$v1",   // 3
  "$a0",   // 4
  "$a1",   // 5
  "$a2",   // 6
  "$a3",   // 7
  "$t0",   // 8
  "$t1",   // 9
  "$t2",   // 10
  "$t3",   // 11
  "$t4",   // 12
  "$t5",   // 13
  "$t6",   // 14
  "$t7",   // 15
  "$s0",   // 16
  "$s1",   // 17
  "$s2",   // 18
  "$s3",   // 19
  "$s4",   // 20
  "$s5",   // 21
  "$s6",   // 22
  "$s7",   // 23
  "$t8",   // 24
  "$t9",   // 25
  "$k0",   // 26 (reserved)
  "$k1",   // 27 (reserved)
  "$gp",   // 28
  "$sp",   // 29
  "$fp",   // 30
  "$ra",   // 31
];
export const getRegisterOutput = (register: number, format: number): string => {
    return registers[register].toString(format).padStart(8, "0");
};

type Instruction = RTypeInstruction | ITypeInstruction | JTypeInstruction;
type RTypeInstruction = {
  name: string,
  source1Register: number,
  source2Register: number,
  destinationRegister: number,
  shiftAmount: number
}
type ITypeInstruction = {
  name: string,
  source1Register: number,
  source2Register: number,
  immediateValue: number
}
type JTypeInstruction = {
  name: string,
  address: number
}

const RTypeInstructionNames: Set<string> = new Set<string>([
  "add", 
  "sub",
  "and",
  "or",
  "xor",
  "nor",
  "slt",
  "sll",
  "srl",
  "sra",
  "sllv",
  "srlv",
  "srav",
  "mult",
  "div",
  "mfhi",
  "mflo",

  "jr",
  "jalr"
]);

const ITypeInstructionNames: Set<string> = new Set<string>([
  "addi",
  "andi",
  "ori",
  "xori",
  "slti",
  "lui",
  "lb",
  "lh",
  "lw",
  "sb",
  "sh",
  "sw",
  "beq",
  "bne",
]);

const JTypeInstructionNames: Set<string> = new Set<string>([
  "j",
  "jal"
]);

// Execute the program 
export const runProgram = (programText: string): void => {
  const programInstructions: Instruction[] = parse(programText);
};

export const parse = (programText: string): Instruction[] => {
  let programLines: string[] = programText.split("\n");
  // remove leading and trailing whitespace and normalize whitespace
  programLines.forEach((_line, index) => {
    programLines[index] = programLines[index].trim().replace(/\s+/g, " ");
  });
  programLines = programLines.filter((programLine => programLine !== ""));
  programLines.forEach((programLine, line) => {

    const instructionName = programLine.substring(0, programLine.indexOf(" "));
  });


  return [];
};