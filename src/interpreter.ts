import { numberFormat } from "./main.tsx";
import {type Instruction, type Operand, InstructionFunctions, InstructionOperands} from "./instructions.ts";

const MAX_REG_VALUE = Math.pow(2, 32) - 1;

// Registers
export const registers: Uint32Array = new Uint32Array(32);
export const registerNames: string[] = [
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
// Non-accessible registers
export let $pc = 0, $hi = 0, $lo = 0;

// Symbol table
const symtab: Map<string, number> = new Map<string, number>();

// Program instructions
let programInstructions: Instruction[] = [];

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
    // $zero can not change value
    registers[0] = 0;
    // increment the program counter
    $pc += 1; // += 4 if this were a byte-addressable array  
  };
  // finish executing
  $pc = 0;
  console.log("finish execution");
  // update the UI registers
  updateRegisterDisplay();
}

export const stepProgam = (): void => {
  // TODO
  $pc += 1;
}

export const parse = (programText: string): Instruction[] => {
  return programText
    .split("\n")
    .map(line => {
      // Remove trailing & leading whitespace, normalize whitespace, remove comments
      return line.split("#")[0].trim().replace(/\s+/g, " ");
    })
    .filter((programLine => programLine !== "")) // remove empty lines
    .map(line => {
      // Convert the list of text lines to a list of instruction types
      const firstSpaceIndex = line.indexOf(" ");
      const instructionName = line.substring(0, firstSpaceIndex).toLowerCase();
      const instructionArgs = line.substring(firstSpaceIndex).replace(/\s+/g, "").split(",");
      const instructionOperands: Operand[] = InstructionOperands.get(instructionName)!;
      const instruction: Instruction = {
        name: instructionName, rs: 0, rt: 0, rd: 0, shamt: 0, imm: 0, address: 0
      };
      for (let operandIndex = 0; operandIndex < instructionOperands.length; operandIndex++){
        const instructionArg: string = instructionArgs[operandIndex];
        const instructionOperand: Operand = instructionOperands[operandIndex];
        // convert string arguments to operands (e.g. "$v0" -> 2, "555" -> 555)
        instruction[instructionOperand] = ["rs", "rt", "rd"].includes(instructionOperand) 
          ? parseRegisterOperand(instructionArg)
          : parseNumericalOperand(instructionArg);
      }
    return instruction;
  });
}

const parseRegisterOperand = (opText: string): number => {
  const register = registerNames.indexOf(opText);
  if (register === -1) throw new Error(`Invalid register operand ${opText} `)
  return register;
}

const parseNumericalOperand = (opText: string): number => {
  const numericalValue = Number.parseInt(opText);
  if (isNaN(numericalValue)) throw new Error(`Invalid numerical value ${opText}`);
  return numericalValue;
}

export const resetProgram = (): void => {
  registers.forEach((_value, index) => {
    registers[index] = 0;
    $pc = 0;
  });
  updateRegisterDisplay();
}

export const getRegisterOutput = (register: number): string => {
  return registers[register].toString(numberFormat).toUpperCase();
}

export const updateRegisterDisplay = (): void => {
  for (let index = 0; index < 32; index++){
    const registerElement = document.getElementById(`reg${index}`);
    if (!registerElement) continue;
    registerElement.textContent = getRegisterOutput(index);
  }
}