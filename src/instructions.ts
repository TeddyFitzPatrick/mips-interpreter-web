import { registers, registerNames, symtab, changeProgramCounter, $pc, $hi, $lo } from "./interpreter.ts";

export type Instruction = {
  name: string,    // e.g. add, lw, sw
  rs: number,      // source 1 register
  rt: number,      // source 2 register
  rd: number,      // destination register
  shamt: number,   // shift amount
                   // the imm/addr of an I-type
  imm: number | string,     
                   // the 26-bit J-type addr
  address: number | string 
}

type InstructionFunction = (instr: Instruction) => void;

export const InstructionFunctions: Map<string, InstructionFunction> = new Map<string, InstructionFunction>([
    ["add", (instr: Instruction): void => {
        registers[instr.rd] = registers[instr.rs] + registers[instr.rt];
    }],
    ["sub", (instr: Instruction): void => {
        registers[instr.rd] = registers[instr.rs] - registers[instr.rt];
    }],    
    ["and", (instr: Instruction): void => {
        registers[instr.rd] = registers[instr.rs] & registers[instr.rt];
    }],
    ["or", (instr: Instruction): void => {
        registers[instr.rd] = registers[instr.rs] | registers[instr.rt];
    }],
    ["xor", (instr: Instruction): void => {
        registers[instr.rd] = registers[instr.rs] ^ registers[instr.rt];
    }],
    ["nor", (instr: Instruction): void => {
        registers[instr.rd] = ~(registers[instr.rs] | registers[instr.rt]);
    }],
    ["slt", (instr: Instruction): void => {
        registers[instr.rd] = (registers[instr.rs] < registers[instr.rt]) ? 1 : 0;
    }],
    ["sll", (instr: Instruction): void => {
        registers[instr.rd] = registers[instr.rt] << instr.shamt;
    }],
    ["srl", (instr: Instruction): void => {
        registers[instr.rd] = registers[instr.rt] >> instr.shamt;
    }],    
    // "sra"
    // "sllv",
    // "srlv",
    // "srav",
    ["mult", (instr: Instruction): void => {
        // signed 32-bit multiplication
        const product = BigInt((registers[instr.rs] << 0) | 0) * BigInt((registers[instr.rt] << 0) | 0);
        registers[registerNames.indexOf("$hi")] = Number(product & BigInt(0xFFFFFFFF))
        registers[registerNames.indexOf("$lo")] = Number((product >> BigInt(32)) & BigInt(0xFFFFFFFF));
    }],
    ["div", (instr: Instruction): void => {
        // $lo holds the quotient
        // $hi holds the remainder
        registers[registerNames.indexOf("$lo")] = registers[instr.rs] / registers[instr.rt];
        registers[registerNames.indexOf("$hi")] = registers[instr.rs ] % registers[instr.rt];
    }],
    ["mfhi", (instr: Instruction): void => {
        registers[instr.rd] = registers[registerNames.indexOf("$hi")];
    }],
    ["mflo", (instr: Instruction): void => {
        registers[instr.rd] = registers[registerNames.indexOf("$lo")];
    }],
    ["jr", (instr: Instruction): void => {
        changeProgramCounter(registers[instr.rs]);
    }],
    ["jalr", (instr: Instruction): void => {
        registers[registerNames.indexOf("$ra")] = $pc + 4;
        changeProgramCounter(registers[instr.rs]);
    }],
    ["addi", (instr: Instruction): void => {
        if (typeof instr.imm !== "number") throw new Error(`Invalid immediate ${instr.imm} for addi instruction`);
        registers[instr.rt] = registers[instr.rs] + +instr.imm;
    }],
    ["andi", (instr: Instruction): void => {
        if (typeof instr.imm !== "number") throw new Error(`Invalid immediate ${instr.imm} for andi instruction`);
        registers[instr.rt] = registers[instr.rs] & +instr.imm;
    }], 
    ["ori", (instr: Instruction): void => {
        if (typeof instr.imm !== "number") throw new Error(`Invalid immediate ${instr.imm} for ori instruction`);
        registers[instr.rt] = registers[instr.rs] | +instr.imm;
    }],
    ["xori", (instr: Instruction): void => {
        if (typeof instr.imm !== "number") throw new Error(`Invalid immediate ${instr.imm} for xori instruction`);
        registers[instr.rt] = registers[instr.rs] ^ +instr.imm;
    }],
    ["slti", (instr: Instruction): void => {
        if (typeof instr.imm !== "number") throw new Error(`Invalid immediate ${instr.imm} for slti instruction`);
        registers[instr.rt] = (registers[instr.rs] < +instr.imm) ? 1 : 0;
    }],
    // "lui",
    // "lb",
    // "lh",
    // "lw",
    // "sb",
    // "sh",
    // "sw",
    ["beq", (instr: Instruction): void => {
        // Check a label is passed instead of an absolute address number
        if (typeof instr.imm === "number") throw new Error(`Invalid address ${instr.imm} for beq instruction`);
        // Verify the label is in the symtab
        const newPC = symtab.get(instr.imm);
        if (newPC === undefined) throw new Error(`Label ${instr.imm} not found`);
        if (registers[instr.rs] === registers[instr.rt]){
            changeProgramCounter(newPC);
        }
    }],
    ["bne", (instr: Instruction): void => {
        // Check a label is passed instead of an absolute address number
        if (typeof instr.imm === "number") throw new Error(`Invalid address ${instr.imm} for bne instruction`);
        // Verify the label is in the symtab
        const newPC = symtab.get(instr.imm);
        if (newPC === undefined) throw new Error(`Invalid label ${instr.imm}`);
        if (registers[instr.rs] !== registers[instr.rt]){
            changeProgramCounter(newPC);
        }
    }],
    ["j", (instr: Instruction): void => {
        if (typeof instr.address === "number") throw new Error(`Invalid address ${instr.address} for j instruction`);
        // Verify the label is in the symtab
        const newPC = symtab.get(instr.address);
        if (newPC === undefined) throw new Error(`Label ${instr.address} not found`);
        changeProgramCounter(newPC);
    }],
    ["jal", (instr: Instruction): void => {
        if (typeof instr.address === "number") throw new Error(`Invalid address ${instr.address} for jal instruction`);
        // Store the next instruction in the $ra
        registers[registerNames.indexOf("$ra")] = $pc + 4;
        // Verify the label is in the symtab
        const newPC = symtab.get(instr.address);
        if (newPC === undefined) throw new Error(`Label ${instr.imm} not found`);
        changeProgramCounter(newPC);
    }],
    // Pseudos
    ["li", (instr: Instruction): void => {
        if (typeof instr.imm === "string") throw new Error(`Illegal immediate value ${instr.imm} for li instruction`)
        registers[instr.rs] = instr.imm;
    }],
    ["la", (instr: Instruction): void => {
        if (typeof instr.imm === "number") throw new Error(`Illegal immediate value ${instr.imm} for la instruction`)
        // Verify the label is in the symtab
        const address = symtab.get(instr.imm);
        if (address === undefined) throw new Error(`Label ${instr.imm} not found`);
        registers[instr.rs] = address;
    }],
    ["move", (instr: Instruction): void => {
        registers[instr.rd] = registers[instr.rs];
    }],
    ["mul", (instr: Instruction): void => {
        registers[instr.rd] = registers[instr.rs] * registers[instr.rt];
    }]
]);

export type Operand = keyof Omit<Instruction, "name">;

export type OperandType = 
    REG = ; |
    ...

export const InstructionOperands: Map<string, Operand[]> = new Map([






    // TODO:  ADD ACTUAL OPERAND TYPES   
        .......................
        [][][][][]]





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
    ["jr", ["rs"]],
    ["jalr", ["rs"]],
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
    ["jal", ["address"]],
    // pseudos
    ["li", ["rs", "imm"]],
    ["la", ["rs", "imm"]],
    ["move", ["rd", "rs"]],
    ["mul", ["rd", "rs", "rt"]]
]);