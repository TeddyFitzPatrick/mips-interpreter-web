import { type Instruction, InstructionSpec, MemoryInstructions, expandPseudoInstruction, instrToString } from "./instructions";
export const DATA_MEM_SIZE = 8_000_004; // (~8 MB)
const MAX_ADDRESSABLE = 8_000_000;
export let memoryViewAddress: number = 8_000_000;

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
export const registers: Uint32Array = new Uint32Array(registerNames.length);
registers[registerNames.indexOf("$sp")] = MAX_ADDRESSABLE;

// Data Memory 
export let DataMemory: Uint8Array = new Uint8Array(DATA_MEM_SIZE);

// Symbol table
let symtab: Map<string, number> = new Map<string, number>();
type UnresolvedAddress = {
  label: string,
  lineIndex: number
}

// Program instructions
type SourceLine = {
  editorLine: number,
  text: string
}
type ParsedInstruction = {
  editorLine: number
  instr: Instruction,
}
let InstructionMemory: ParsedInstruction[] = [];

export let errorText: string = "";

export const minify = (programLines: string[]): SourceLine[] => {
  return programLines
    .map((line, index) => ({
      editorLine: index + 1,
      // Remove trailing & leading whitespace, normalize whitespace, remove comments
      text: line.split("#")[0].trim().replace(/\s+/g, " ")
    }))
    .filter(line => line.text !== "") // remove empty lines after removing whitespace/comments
}

// quickParse to quickly gather label names for autocomplete suggestins
export const sourceToInstructions = (programLines: SourceLine[], labelStore: Map<string, number>, quickParse = false): ParsedInstruction[] => {
  let lineNumber = 0;
  const parsedInstructions: ParsedInstruction[] = [];
  const unresolvedAddresses: UnresolvedAddress[] = [];
  // PASS 1: populate symtab, expand pseudos, and generate partial instructions (with unresolved addresses) 
  programLines.forEach(line => {
    let colonIndex, label;
    // store the labels of a line and strip whitespace until only the empty string or an instruction remains
    while ((colonIndex = line.text.indexOf(":")) !== -1){
      // Remove leading whitespace before the label
      label = line.text.slice(0, colonIndex).replace(/^\s+/, "");
      // Label validation
      const validateResponse = validateLabelName(label);
      if (typeof validateResponse === "string"){
        if (!quickParse) throw new Error (validateResponse);
      }
      else {
        // Add the label to the symtab
        labelStore.set(label, lineNumber * 4);
      }
      // Cut the label out of the line and repeat for other labels
      line.text = line.text.slice(colonIndex + 1).trim();
    }
    // line.text is now either an empty string, invalid instruction, or valid instruction
    if (line.text !== "" && !quickParse) {
      const instruction: Instruction = lineToInstruction(line.text, lineNumber, unresolvedAddresses);
      const spec = InstructionSpec.get(instruction.name);
      // expand pseudo instructions into native instruction(s)
      const lineInstructions: ParsedInstruction[] = [];
      if (spec?.category === "pseudo") {
        const nativeInstructions = expandPseudoInstruction(instruction);
        nativeInstructions.forEach((instruction: Instruction) => lineInstructions.push({editorLine: line.editorLine, instr: instruction}));
      } else {
        lineInstructions.push({editorLine: line.editorLine, instr: instruction});  
      }
      // advance the address of the next instruction based on the instruction's expansion
      lineNumber += lineInstructions.length;
      lineInstructions.forEach((lineInstruction: ParsedInstruction) => parsedInstructions.push(lineInstruction))
    };
  });
  // PASS 2: resolve unresolved addresses using the populated symtab
  unresolvedAddresses.forEach(({label, lineIndex}: UnresolvedAddress) => {
    if (!symtab.has(label)) throw new Error(`Could not find label ${label}`);
    const labelAddress = symtab.get(label);
    if (!labelAddress) throw new Error(`Illegal label address ${labelAddress} for label ${label}`);
    const unresolvedInstr: Instruction = parsedInstructions[lineIndex].instr;
    // assigns the label's address to the target and imm fields, because the instruction could be an I or J type
    unresolvedInstr.target = labelAddress; 
    unresolvedInstr.imm = labelAddress;
  });
  return parsedInstructions;
}

export const lineToInstruction = (line: string, lineNumber: number, unresolvedAddresses: UnresolvedAddress[]): Instruction => {
  // Separate each line into an instruction name and its arguments ("addi" + "$t0, $t0, 1")
  const firstSpaceIndex = line.indexOf(" ");
  if (firstSpaceIndex === -1) throw new Error(`Invalid syntax, instruction is missing a space`)
  const instructionName = line.slice(0, firstSpaceIndex).toLowerCase();
  // Get the instruction's operands (e.g. addi => ["rs", "rt", "imm"])
  const instructionSpec = InstructionSpec.get(instructionName);
  let lineArguments = line.slice(firstSpaceIndex).replace(/\s+/g, "").split(",").filter(arg => arg !== "");
  if (!instructionSpec) throw new Error(`Instruction ${instructionName} not found`);
  // Handle the special syntax of memory instructions i.e. rt, imm(rs) 
  if (MemoryInstructions.indexOf(instructionName) !== -1){
    if (lineArguments.length !== 2) throw new Error(`Invalid argument count for ${instructionName} instruction`)
    const displacementArg = lineArguments.pop();
    if (displacementArg === undefined) throw new Error(`Invalid syntax for ${instructionName} instruction`);
    const openParenIndex = displacementArg.indexOf("(");
    if (openParenIndex === -1 || displacementArg.slice(-1) !== ")") throw new Error(`Invalid syntax for ${instructionName} instruction`);
    // Push the offset immediate
    lineArguments.push(displacementArg.slice(0, openParenIndex));
    // Push the rs argument
    lineArguments.push(displacementArg.slice(openParenIndex + 1, displacementArg.length - 1));
  }
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
  for (let index = 0; index < operandFields.length; index++){
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
      if (!symtab.has(lineArgument)) {
        unresolvedAddresses.push({label: lineArgument, lineIndex: lineNumber});
        instruction[field] = 0;  // leave the label's address blank to be resolved in the next parsing pass
      } else instruction[field] = symtab.get(lineArgument)!;
    }
  }
  return instruction;
}

export const parse = (programText: string): ParsedInstruction[] => {
  const simulationTrace = document.getElementById("simulationTrace");
  if (!simulationTrace) throw new Error("Couldn't get simulation trace in stepProgram func");
  try {
    // stripping comments + trailing & leading whitespace
    const strippedSourceLines = minify(programText.split("\n"));
    const parsedInstructions = sourceToInstructions(strippedSourceLines, symtab);

    console.log("symtab::");
    console.dir(symtab);

    return parsedInstructions;
  } catch (error: any){
    console.log("Parsing Error: ", error);
    // catch the error and get its message
    if (error instanceof Error){
      errorText = error.message;
    } else if (typeof error === "string"){
      errorText = error;
    } else {
      console.log("Unknown/Unhandled Error: ", error);
      console.log("Unknown/Unhandled Error Type", typeof error);
    } 
    addErrorLog(simulationTrace, `${error}`);
  }
  return [];
}

export const stepProgram = async (programText: string): Promise<void> => {
  if (errorText) return;
  const simulationTrace = document.getElementById("simulationTrace");
  if (!simulationTrace) throw new Error("Couldn't get simulation trace in stepProgram func");

  await new Promise(resolve => setTimeout(resolve, 1000 * (1 / 64)));

  // parse the program if it hasn't already been
  if (programText && InstructionMemory.length === 0){
    InstructionMemory = parse(programText);
  }
  if (InstructionMemory.length === 0) return;
  // execute the next instruction
  let currEditorLine = -1;
  try {
    const instructionIndex = registers[registerNames.indexOf("$pc")] / 4;
    if (instructionIndex >= InstructionMemory.length){
      return;
    }
    const {editorLine, instr}: ParsedInstruction = InstructionMemory[instructionIndex];
    currEditorLine = editorLine;
    // retrieve the function's execution function (e.g. add => {rd = rs + rt})
    const instructionFunction = InstructionSpec.get(instr.name)!.func;
    // run the function with operands
    instructionFunction(instr);
    // do not allow $zero to change value
    registers[0] = 0;
    // increment the program counter if the instruction didn't change it
    if (instructionIndex === registers[registerNames.indexOf("$pc")] / 4){
      registers[registerNames.indexOf("$pc")] += 4; 
    }
    // update log text
    addLog(simulationTrace, `line ${currEditorLine} → ${instrToString(instr)}\n`);
  } catch (error: unknown){ 
    console.log("error detected");
    // catch the error and get its message
    if (error instanceof Error){
      errorText = error.message;
    } else if (typeof error === "string"){
      errorText = error;
    } else {
      console.log("Unknown/Unhandled Error: ", error);
      console.log("Unknown/Unhandled Error Type", typeof error);
    } 
    // populate the errorOutput with the errorText
    addErrorLog(simulationTrace, `line ${currEditorLine} → ${errorText}`);
  }
}

export const runProgram = async (programText: string): Promise<void> => {
  resetProgram();
  InstructionMemory = parse(programText);
  // execute the program instructions
  let instructionIndex: number;
  while ((instructionIndex = registers[registerNames.indexOf("$pc")] / 4) < InstructionMemory.length){
    await stepProgram(programText);

    if (errorText) break;
  };
}

export const resetProgram = (): void => {
  // reset registers to 0
  registers.forEach((_value, index) => {
    registers[index] = (index === registerNames.indexOf("$sp")) ? MAX_ADDRESSABLE : 0;
  });
  // reset symbol table
  symtab = new Map<string, number>();
  // reset instruction memory
  InstructionMemory = [];
  // reset data memory 
  DataMemory = new Uint8Array(DATA_MEM_SIZE);
  // reset error text and output
  errorText = "";
  // clear the simulation trace's logs
  if (typeof document !== 'undefined'){
    const simulationTrace = document.getElementById("simulationTrace");
    if (simulationTrace) simulationTrace.replaceChildren();
  }
}

const addLog = (simulationTrace: HTMLElement | null, logText: string) => {
  if (!simulationTrace) throw new Error("Couldn't get simulationTrace")
  const logLine = document.createElement("div");
  logLine.textContent = logText
  simulationTrace.appendChild(logLine);
  simulationTrace.scrollTop = simulationTrace.scrollHeight;
}

const addErrorLog = (simulationTrace: HTMLElement | null, errorLogText: string): void => {
  if (!simulationTrace) throw new Error("Couldn't get simulationTrace")
  const errorLog = document.createElement("div");
  errorLog.textContent = errorLogText;
  errorLog.classList.add("text-red-500");
  simulationTrace.appendChild(errorLog);
  simulationTrace.scrollTop = simulationTrace.scrollHeight;
}

export const getRegisterOutput = (register: number, numberFormat: number): string => {
  let registerPrefix = '';
  if (numberFormat === 2){
    registerPrefix = '0b';
  } else if (numberFormat === 16){
    registerPrefix = '0x';
  }
  let registerContents = registers[register];
  // sign decimal numbers
  if (numberFormat === 10) {
    registerContents |= 0;
  } 
  return registerPrefix + registerContents.toString(numberFormat).toUpperCase();  // uppercase for hex (0xff => 0xFF)
}

export const updateRegisterDisplay = (numberFormat: number): void => {
  for (let index = 0; index < 32; index++){
    const registerElement = document.getElementById(`reg${index}`);
    registerElement!.textContent = getRegisterOutput(index, numberFormat);
  }
}

export const updateMemoryView = (): void => {
  if (memoryViewAddress === null || memoryViewAddress === undefined) return;
  const memoryView = document.getElementById("memoryView");
  if (!memoryView) return;
  // Update memory view to the 8 bytes starting at the inputted address
  memoryView.textContent = "";
  for (let offset = 0; offset < 8; offset++){
    const memoryAddress = memoryViewAddress + offset;
    // bound check
    if (memoryAddress < 0 || memoryAddress > DATA_MEM_SIZE - 1) break;
    const memoryByte: number = DataMemory[memoryAddress];
    memoryView.textContent += ` ${memoryByte.toString(16).toUpperCase().padStart(2, "0")}`;
  }
}

export const updateMemoryViewAddress = (newAddress: string): string => {
  if (!isNumeric(newAddress)) return "";
  newAddress = String(Math.max(0, Math.min(+newAddress, MAX_ADDRESSABLE)));
  memoryViewAddress = +newAddress;
  return newAddress;
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

export const isUImm16 = (text: string): boolean => {
  if (!isNumeric(text)) return false;
  return 0 <= +text && +text <= Math.pow(2, 16) - 1;
}

export const isImm16 = (text: string): boolean => {
  console.log("text", text)
  console.log("numeric", +text);
  if (!isNumeric(text)) return false;
  return -Math.pow(2, 15) <= +text && +text <= Math.pow(2, 15) - 1;
}

export const isUImm32 = (text: string): boolean => {
  if (!isNumeric(text)) return false;
  return 0 <= +text && +text <= Math.pow(2, 32) - 1;
}

export const isImm32 = (text: string): boolean => {
  if (!isNumeric(text)) return false;
  return -Math.pow(2, 31) <= +text && +text <= Math.pow(2, 31) - 1;
}

export const isShiftAmount = (text: string): boolean => {
  if (!isNumeric(text)) return false;
  return 0 <= +text && +text <= Math.pow(2, 5) - 1;
}


/**
 * Returns true if a string represents a finite number 
 */
const isNumeric = (numberRepresentation: string): boolean => {
  return numberRepresentation.trim() !== "" && Number.isFinite(+numberRepresentation);
}

export const validateLabelName = (label: string): boolean | string => {
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