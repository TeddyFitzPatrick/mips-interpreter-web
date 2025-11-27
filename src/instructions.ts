import { registers } from "./interpreter.ts";

export type Instruction = {
  name: string,    // e.g. add, lw, sw
  rs: number,      // source 1 register
  rt: number,      // source 2 register
  rd: number,      // destination register
  shamt: number,   // shift amount
  imm: number,     // the imm/addr of an I-type
  address: number  // the 26-bit J-type addr
}

type InstructionFunction = (instr: Instruction) => void;

export const InstructionFunctions: Map<string, InstructionFunction> = new Map<string, InstructionFunction>([
    ["add", (instr: Instruction) => {
        registers[instr.rd] = registers[instr.rs] + registers[instr.rt];
    }],
    ["sub", (instr: Instruction) => {
        registers[instr.rd] = registers[instr.rs] - registers[instr.rt];
    }],    
    ["and", (instr: Instruction) => {
        registers[instr.rd] = registers[instr.rs] & registers[instr.rt];
    }],
    ["or", (instr: Instruction) => {
        registers[instr.rd] = registers[instr.rs] | registers[instr.rt];
    }],
    ["xor", (instr: Instruction) => {
        registers[instr.rd] = registers[instr.rs] ^ registers[instr.rt];
    }],
    ["nor", (instr: Instruction) => {
        registers[instr.rd] = ~(registers[instr.rs] | registers[instr.rt]);
    }],
    ["slt", (instr: Instruction) => {
        registers[instr.rd] = (registers[instr.rs] < registers[instr.rt]) ? 1 : 0;
    }],
    ["sll", (instr: Instruction) => {
        registers[instr.rd] = registers[instr.rt] << instr.shamt;
    }],
    ["srl", (instr: Instruction) => {
        registers[instr.rd] = registers[instr.rt] >> instr.shamt;
    }],    
    // "sra"
    // "sllv",
    // "srlv",
    // "srav",
    // "mult",
    // "div",
    // "mfhi",
    // "mflo",
    // "jr",
    // "jalr",
    ["addi", (instr: Instruction) => {
        registers[instr.rt] = registers[instr.rs] + instr.imm;
    }],
    ["andi", (instr: Instruction) => {
        registers[instr.rt] = registers[instr.rs] & instr.imm;
    }], 
    ["ori", (instr: Instruction) => {
        registers[instr.rt] = registers[instr.rs] | instr.imm;
    }],
    ["xori", (instr: Instruction) => {
        registers[instr.rt] = registers[instr.rs] ^ instr.imm;
    }],
    ["slti", (instr: Instruction) => {
        registers[instr.rt] = (registers[instr.rs] < instr.imm) ? 1 : 0;
    }],
    ["li", (instr: Instruction): void => {
        registers[instr.rs] = instr.imm;
    }]    
    // "lui",
    // "lb",
    // "lh",
    // "lw",
    // "sb",
    // "sh",
    // "sw",
    // "beq",
    // "bne",
    // "j",
    // "jal"
]);

export type Operand = keyof Omit<Instruction, "name">;

export const InstructionOperands: Map<string, Operand[]> = new Map([
    ["add", ["rd", "rs", "rt"]],
    ["sub", ["rd", "rs", "rt"]],
    ["and", ["rd", "rs", "rt"]],
    ["or", ["rd", "rs", "rt"]],
    ["xor", ["rd", "rs", "rt"]],
    ["nor", ["rd", "rs", "rt"]],
    ["slt", ["rd", "rs", "rt"]],
    ["sll", ["rd", "rt", "shamt"]],
    ["srl", ["rd", "rt", "shamt"]],
    ["sra", ["rd", "rt", "shamt"]],
    ["sllv", ["rd", "rt", "rs"]],
    ["srlv", ["rd", "rt", "rs"]],
    ["srav", ["rd", "rt", "rs"]],
    ["mult", ["rs", "rt"]],
    ["div", ["rs", "rt"]],
    ["mfhi", ["rd"]],
    ["mflo", ["rd"]],
    ["li", ["rs", "imm"]],
    ["jr", ["rs"]],
    ["jalr", ["rd", "rs"]],
    ["addi", ["rt", "rs", "imm"]],
    ["andi", ["rt", "rs", "imm"]],
    ["ori", ["rt", "rs", "imm"]],
    ["xori", ["rt", "rs", "imm"]],
    ["slti", ["rt", "rs", "imm"]],
    ["lui", ["rt", "imm"]],
    ["lb", ["rt", "imm", "rs"]],
    ["lh", ["rt", "imm", "rs"]],
    ["lw", ["rt", "imm", "rs"]],
    ["sb", ["rt", "imm", "rs"]],
    ["sh", ["rt", "imm", "rs"]],
    ["sw", ["rt", "imm", "rs"]],
    ["beq", ["rs", "rt", "imm"]],
    ["bne", ["rs", "rt", "imm"]],
    ["j", ["address"]],
    ["jal", ["address"]]
]);