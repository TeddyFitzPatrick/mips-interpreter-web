import { numberFormat } from "./main.tsx";
import {type Instruction, type Operand, InstructionFunctions, InstructionOperands} from "./instructions.ts";

//const MAX_REG_VALUE = Math.pow(2, 32) - 1;

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
  "$pc",   // registers not accessible to users
  "$hi",
  "$lo"
];

// Symbol table
export let symtab: Map<string, number> = new Map<string, number>();

// Program instructions
let programInstructions: Instruction[] = [];

// Execute the program 
export const runProgram = (programText: string): void => {
  const errorOutput: HTMLElement | null = document.getElementById("errorOutput");
  if (errorOutput === null) return;
  try{
    // parse the program text into a list of instructions
    programInstructions = parse(programText);
    console.log("Instructions:",programInstructions);
    console.log("Symtab:",symtab);
    // no instructions to execute
    if (programInstructions.length === 0) return;
    // execute the program instructions
    let counter = 0;
    let instructionIndex: number;
    while ((instructionIndex = registers[registerNames.indexOf("$pc")] / 4) < programInstructions.length){
      const programInstruction = programInstructions[instructionIndex];
      // retrieve the function's execution function (e.g. add => {rd = rs + rt})
      let originalPC = instructionIndex;
      const instructionFunction = InstructionFunctions.get(programInstruction.name);
      if (instructionFunction === undefined) throw new Error(`Illegal Function: ${programInstruction.name}`);
      // run the function with operands
      instructionFunction(programInstruction);
      // $zero can not change value
      registers[0] = 0;
      // increment the program counter if the instruction didn't change it
      if (originalPC === registers[registerNames.indexOf("$pc")]){
        registers[registerNames.indexOf("$pc")] += 4; 
      }
      counter++;
      if (counter > 100) break;
    };
    // finish executing
    console.log("successful program execution");
    // write the final register contents to the UI
    updateRegisterDisplay();
  } catch (error: unknown){
    console.log("failed program execution")
    // Parsing or program execution failure
    if (error instanceof Error){
      errorOutput.textContent = error.message;
    } else if (typeof error === "string"){
      errorOutput.textContent = error;
    } else {
      console.log("Error: ", error);
      console.log("Unknown error type", typeof error);
    }
  } finally {
    resetProgram();
  }
}

// export const stepProgam = (programText: string): void => {
//   if (programInstructions.length === 0){
//   }
// }

export const resetProgram = (): void => {
  // reset error output
  const errorOutput: HTMLElement | null = document.getElementById("errorOutput");
  if (errorOutput === null) return;
  errorOutput.textContent = "";
  // reset registers to 0
  registers.forEach((_value, index) => {
    registers[index] = 0;
  });
  // reset symbol table
  symtab = new Map<string, number>(); 
}

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
        const validateResponse = isValidLabel(label);
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
    const instructionArgs = line.slice(firstSpaceIndex).replace(/\s+/g, "").split(",");
    // Get the instruction's operands (e.g. addi => ["rs", "rt", "imm"])
    const instructionOperands = InstructionOperands.get(instructionName);
    if (instructionOperands === undefined) throw new Error(`Instruction operands for ${instructionName} could not be determined.`);
    // Generate the line's corresponding instruction
    const instruction: Instruction = {
      name: instructionName, rs: 0, rt: 0, rd: 0, shamt: 0, imm: 0, address: 0
    }
    // Build the mismatching arity error output
    const operandFormat: string[] = [];
    for (const instructionOperand of instructionOperands){
      if (["rs", "rt", "rd"].includes(instructionOperand)){
        operandFormat.push("Register");
      } else if (["imm", "address", "shamt"].includes(instructionOperand)){
        operandFormat.push("Immediate/Address");
      }
    }
    // Mismatching arity error
    if (operandFormat.length !== instructionArgs.length){
      throw new Error(
        `Instruction "${instructionName}" expects ${operandFormat.length} arguments, got ${instructionArgs.length}\n(${instructionName} ${operandFormat.join(", ")})`
      )
    }

    for (let operandIndex = 0; operandIndex < instructionOperands.length; operandIndex++){
      const instructionArg: string = instructionArgs[operandIndex];
      const instructionOperand: Operand = instructionOperands[operandIndex];
      // convert string argument representation to operands (e.g. "$v0" -> 2, "555" -> 555, "loop:" -> 24)
      if (operandFormat[operandIndex] === "Register"){
        instruction[instructionOperand] = parseRegisterOperand(instructionArg);
      }
      else if (isNumeric(instructionArg)){
        instruction[instructionOperand] = parseNumericalOperand(instructionArg);      
      }
      else if (instructionOperand === "address" || instructionOperand === "imm"){
        // label argument
        instruction[instructionOperand] = instructionArg;
      } else{
        throw new Error(`Invalid argument ${instructionArg} for instruction ${instructionName} operand ${instructionOperand}`);
      }
    }
    // Increment the line number
    lineNumber++;
    return instruction;
  });
}

const parseRegisterOperand = (opText: string): number => {
  // Register takes the form of $0, $1, ..., $31
  if (isNumeric(opText.substring(1))){
    return +opText.substring(1);
  }
  const register = registerNames.indexOf(opText);
  if (register === -1) throw new Error(`Invalid register operand ${opText} `);
  return register;
}

const parseNumericalOperand = (opText: string): number => {
  if (!isNumeric(opText)) throw new Error(`Invalid numerical value ${opText}`);
  return +opText;
}

const isNumeric = (numberRepresentation: string): boolean => {
  return numberRepresentation.trim() !== "" && Number.isFinite(+numberRepresentation);
}

const isValidRegister = (regText: string): boolean | string => {
  if (regText[0] !== "$") return `Invalid register ${regText}, must start with $`;
  const isSymbolicRegister = (registerNames.indexOf(regText) !== -1);
  regText = regText.slice(1);
  const isNumericRegister = (isNumeric(regText) && 0 <= +regText && +regText <= 31);
  if (!isSymbolicRegister && !isNumericRegister) return `Invalid register ${regText}`;
  return true;
}

const isValidLabel = (label: string): boolean | string => {
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

export const changeProgramCounter = (newPC: number): void => {
  $pc = newPC;
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

