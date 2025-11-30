import { numberFormat } from "./main.tsx";
import {type Instruction, InstructionSpec} from "./instructions.ts";
const DATA_MEM_SIZE = 8_000_000; // (~8 MB)

// Registers
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
  "$pc",   // registers not accessible to users
  "$hi",
  "$lo"
];
export const registers: Int32Array = new Int32Array(registerNames.length);


// Data Memory 
export let DataMemory: Int8Array = new Int8Array(DATA_MEM_SIZE);

// Symbol table
let symtab: Map<string, number> = new Map<string, number>();

// Program instructions
let InstructionMemory: Instruction[] = [];

export const parse = (programText: string): Instruction[] => {
  let lineNumber: number = 0;
  const programLines = programText
    .split("\n")
    .map(line => {
      // Remove trailing & leading whitespace, normalize whitespace, remove comments
      const cleanLine = line.split("#")[0].trim().replace(/\s+/g, " ")
      // Add labels to the symble tab
      return cleanLine
    })
    .filter(line => line !== "") // remove empty lines after removing whitespace/comments
    .map(line => {
      let colonIndex;
      while ((colonIndex = line.indexOf(":")) !== -1){
        // Remove leading whitespace before the label
        let label = line.slice(0, colonIndex).replace(/^\s+/, "");
        // Label validation
        const validateResponse = validateLabelName(label);
        if (typeof validateResponse === "string") throw new Error (validateResponse);
        // Add the label to the symtab
        symtab.set(label, lineNumber * 4);
        // Cut the label out of the line and repeat for other labels
        line = line.slice(colonIndex + 1).trim();
      }
      if (line !== "") lineNumber++;
      return line;
    })
    .filter(line => line !== "") // remove empty lines after removing labels
  // If after removing whitespace, comments, and labels, there are no instructions
  if (programLines.length === 0) return [];
  // Convert each line into an instruction
  return programLines.map(line => {
    // Separate each line into an instruction name and its arguments ("addi" + "$t0, $t0, 1")
    const firstSpaceIndex = line.indexOf(" ");
    if (firstSpaceIndex === -1) throw new Error(`Invalid line "${line}", missing a space`)
    const instructionName = line.slice(0, firstSpaceIndex).toLowerCase();
    const lineArguments = line.slice(firstSpaceIndex).replace(/\s+/g, "").split(",").filter(arg => arg !== "");
    // Get the instruction's operands (e.g. addi => ["rs", "rt", "imm"])
    const instructionSpec = InstructionSpec.get(instructionName);
    if (instructionSpec === undefined) throw new Error(`Instruction ${instructionName} not found`);
    const operandFields = instructionSpec.fields;
    const operandTypes = instructionSpec.types;
    // Generate the line's corresponding instruction
    const instruction: Instruction = {
      name: instructionName, rs: -1, rt: -1, rd: -1, shamt: -1, imm: -1, target: -1
    }
    // Arity mismatch
    if (lineArguments.length !== operandFields.length){
      throw new Error(
        `Invalid argument count for ${instructionName} (expected ${operandFields.length}, got ${lineArguments.length})\n` +
        `Usage: ${instructionName} ${operandFields.join(", ")}`
      );
    }
    // Put the line arguments into the instruction's fields
    for (let index = 0; index <= operandFields.length; index++){
      const lineArgument = lineArguments[index];
      const field = operandFields[index];
      const operandType = operandTypes[index];
      if (operandType === "Register") {
        if (!isRegister(lineArgument)) throw new Error(`Invalid register argument ${lineArgument}`);
        instruction[field] = (registerNames.includes(lineArgument)) ? registerNames.indexOf(lineArgument) : +lineArgument.slice(1);
      } else if (operandType === "UImm16") {
        if (!isUImm16(lineArgument)) throw new Error(`Invalid UImm16 argument ${lineArgument}`);
        instruction[field] = +lineArgument;
      } else if (operandType === "Imm16") {
        if (!isImm16(lineArgument)) throw new Error(`Invalid Imm16 argument ${lineArgument}`);
        instruction[field] = +lineArgument;
      } else if (operandType === "UImm32") {
        if (!isUImm32(lineArgument)) throw new Error(`Invalid UImm32 argument ${lineArgument}`);
        instruction[field] = +lineArgument;
      } else if (operandType === "Imm32") {
        if (!isImm32(lineArgument)) throw new Error(`Invalid Imm32 argument ${lineArgument}`);
        instruction[field] = +lineArgument;
      } else if (operandType === "ShiftAmount") {
        if (!isShiftAmount(lineArgument)) throw new Error(`Invalid ShiftAmount argument ${lineArgument}`);
        instruction[field] = +lineArgument;
      } else if (operandType === "Label") {
        if (!isLabel(lineArgument)) throw new Error(`Invalid Label argument ${lineArgument}`);
        instruction[field] = symtab.get(lineArgument)!;
      }
      // Add the instruction to instruction memory
      InstructionMemory.push(instruction);
    }
    // Increment the line number
    lineNumber++;
    return instruction;
  });
}

const isRegister = (text: string): boolean => {
  // Disallow user access to special-purpose registers
  if (text === "$pc" || text === "$hi" || text === "$lo") return false;
  // Symbolic register (e.g. $v0)
  if (registerNames.includes(text)) return true;
  // Numeric register (e.g. $5)
  if (text[0] === "$" && isNumeric(text.slice(1)) && 0 <= +text.slice(1) && +text.slice(1) <= 31) return true;
  return false
}

const isUImm16 = (text: string): boolean => {
  if (!isNumeric(text)) return false;
  return 0 <= +text && +text <= Math.pow(2,16) - 1;
}

const isImm16 = (text: string): boolean => {
  if (!isNumeric(text)) return false;
  return -Math.pow(2,15) <= +text && +text <= Math.pow(2,15) - 1;
}

const isUImm32 = (text: string): boolean => {
  if (!isNumeric(text)) return false;
  return 0 <= +text && +text <= Math.pow(2,32) - 1;
}

const isImm32 = (text: string): boolean => {
  if (!isNumeric(text)) return false;
  return -Math.pow(2,31) <= +text && +text <= Math.pow(2,31) - 1;
}

const isShiftAmount = (text: string): boolean => {
  if (!isNumeric(text)) return false;
  return 0 <= +text && +text <= Math.pow(2,5) - 1;
}

const isLabel = (text: string): boolean => {
  return symtab.has(text);
}

const isNumeric = (numberRepresentation: string): boolean => {
  return numberRepresentation.trim() !== "" && Number.isFinite(+numberRepresentation);
}

const validateLabelName = (label: string): boolean | string => {
  // No empty string labels
  if (label === "") return `Empty label`;
  // No spaces in the label name
  if (/\s/.test(label)) return `Invalid label ${label}`;
  // Only letters or _ for the first character
  if (!/^[A-Za-z_]$/.test(label[0])) return `Illegal first character for label ${label}`;
  // All subsequent characters in the label must be alphanumeric or _
  for (let index = 1; index < label.length; index++){
    if (!/^[A-Za-z0-9_]$/.test(label[index])) return `Illegal label ${label}, special characters not allowed`;
  }
  // No duplicate labels
  if (label in symtab) return `Duplicate label ${label}`;
  return true;
}

export const runProgram = (programText: string): void => {
  resetProgram(); // clear any previous runs
  const errorOutput: HTMLElement | null = document.getElementById("errorOutput");
  if (errorOutput === null) return;
  try{
    // parse the program text into a list of instructions
    InstructionMemory = parse(programText);
    console.log("Instructions:",InstructionMemory);
    console.log("Symtab:",symtab);
    // execute the program instructions
    let counter = 0;
    let instructionIndex: number;
    while ((instructionIndex = registers[registerNames.indexOf("$pc")] / 4) < InstructionMemory.length){
      console.log("index::",instructionIndex);
      const instr = InstructionMemory[instructionIndex];
      console.log(instr.name);
      // retrieve the function's execution function (e.g. add => {rd = rs + rt})
      const instructionFunction = InstructionSpec.get(instr.name)!.func;
      // run the function with operands
      instructionFunction(instr);
      // $zero can not change value
      registers[0] = 0;
      // increment the program counter if the instruction didn't change it
      if (instructionIndex === registers[registerNames.indexOf("$pc")] / 4){
        registers[registerNames.indexOf("$pc")] += 4; 
      }
      counter++;
      if (counter > 100) break;
    };
    // finish executing
    console.log("successful program execution");
    console.log(registers);
    // write the final register contents to the UI
    updateRegisterDisplay();
  } catch (error: unknown){
    console.log("failed program execution")
    resetProgram();
    // Parsing or program execution failure
    if (error instanceof Error){
      errorOutput.textContent = error.message;
    } else if (typeof error === "string"){
      errorOutput.textContent = error;
    } else {
      console.log("Error: ", error);
      console.log("Unknown error type", typeof error);
    }
  }
}

export const resetProgram = (): void => {
  // reset registers to 0
  registers.forEach((_value, index) => {
    registers[index] = 0;
  });
  // reset symbol table
  symtab = new Map<string, number>();
  // reset instruction memory
  InstructionMemory = [];
  // reset data memory 
  DataMemory = new Int8Array(DATA_MEM_SIZE);
  // reset error output
  const errorOutput: HTMLElement | null = document.getElementById("errorOutput");
  if (errorOutput === null) return;
  errorOutput.textContent = "";
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

