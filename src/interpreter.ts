import {type Instruction, type Operand} from "./instructions.ts";
import {InstructionFunctions, InstructionOperands} from "./instructions.ts";

const MAX_REG_VALUE = Math.pow(2, 32) - 1;
const BIN = 2, OCTAL = 8, DEC = 10, HEX = 16;

// Registers
export const registers: Uint32Array = new Uint32Array(32);
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
export const getRegisterOutput = (register: number, format?: number): string => {
  if (format === undefined) format = HEX;
  return registers[register].toString(format).padStart(8, "0");
};
// Non-accessible registers
export let $pc = 0, $hi = 0, $lo = 0;

// Symbol table
const symtab: Map<string, number> = new Map<string, number>();

// Execute the program 
export const runProgram = (programText: string): void => {
  // parse the program text into a list of instructions
  const programInstructions: Instruction[] = parse(programText);
  // no instructions to execute
  if (programInstructions.length === 0) return;
  // execute the program instructions
  while ($pc < programInstructions.length){
    const programInstruction = programInstructions[$pc];
    // retrieve the function's execution function (e.g. add => {rd = rs + rt})
    const instructionFunction = InstructionFunctions.get(programInstruction.name)!;
    // run the function with operands
    instructionFunction(programInstruction);
    // increment the program counter
    $pc += 1; // += 4 if this were a byte-addressable array  
  };
  // finish executing
  $pc = 0;
  console.log("finish execution");

  // update the UI registers
  updateRegisterDisplay();
};

export const parse = (programText: string): Instruction[] => {
  console.log("\n\n")
  let programLines: string[] = programText.split("\n");
  // Remove leading and trailing whitespace and normalize whitespace
  programLines.forEach((_line, index) => {
    programLines[index] = programLines[index].trim().replace(/\s+/g, " ");
    // remove comments
    const commentIndex = programLines[index].indexOf("#");
    if (commentIndex !== -1){
      programLines[index] = programLines[index].substring(0, commentIndex);
    }
  });
  // Remove empty lines
  programLines = programLines.filter((programLine => programLine !== ""));
  // Convert each line into an instruction
  let programInstructions: Instruction[] = [];
  programLines.forEach((programLine, line) => {
    // separate the line into an instruction name and it's operands
    const instructionName = programLine.substring(0, programLine.indexOf(" ")).toLowerCase();
    const instructionArgs = programLine.substring(programLine.indexOf(" ")).replace(/\s+/g, "").split(",");
    // get the corresponding operand fields for that instruction
    const instructionOperands: Operand[] = InstructionOperands.get(instructionName)!;
    // build the instruction given its format
    const lineInstruction: Instruction = {
      name: instructionName,
      rs: 0,
      rt: 0,
      rd: 0,
      shamt: 0,
      imm: 0,
      address: 0
    }
    // match each argument to its corresponding operand
    let operandIndex = 0;
    instructionArgs.forEach((instructionArg) => {
      const instructionOperand: keyof Instruction = instructionOperands[operandIndex++];
      // convert string arguments to operands (e.g. "$v0" -> 2, "555" -> 555)
      lineInstruction[instructionOperand] = ["rs", "rt", "rd"].includes(instructionOperand) 
        ? parseRegisterOperand(instructionArg)
        : parseNumericalOperand(instructionArg);
    });
    programInstructions.push(lineInstruction);
  });
  console.log(`Number of parsed instructions: ${programLines.length}`)
  return programInstructions;
};

const parseRegisterOperand = (opText: string): number => {
  const register = registerLabels.indexOf(opText);
  if (register === -1) throw new Error(`Invalid register operand ${opText} `)
  return register;
}

const parseNumericalOperand = (opText: string): number => {
  const numericalValue = Number.parseInt(opText);
  if (isNaN(numericalValue)) throw new Error(`Invalid numerical value ${opText}`);
  return numericalValue;
}

const updateRegisterDisplay = (): void => {
  for (let index = 0; index < 32; index++){
    const registerElement = document.getElementById(`reg${index}`);
    if (!registerElement) continue;
    registerElement.textContent = getRegisterOutput(index);
  }
}