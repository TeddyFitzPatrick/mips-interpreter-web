import { registers, registerNames } from "./interpreter.ts";

export type Instruction = {
  name: string,    // corresponds to opcode      (6-bits)
  rs: number,      // source 1 register          (5-bits)
  rt: number,      // source 2 register          (5-bits)
  rd: number,      // destination register       (5-bits)
  shamt: number,   // shift amount               (5-bits)
  imm: number,     // the imm/addr of an I-type  (16-bits)
  target: number   // the 26-bit J-type addr     (26-bits)
}

export type Operand = keyof Omit<Instruction, "name">;

export type OperandType = 
    "Register" |
    "UImm16" |
    "Imm16" |
    "UImm32" |
    "Imm32" |
    "ShiftAmount" |
    "Label";

export type InstructionFunction = (instr: Instruction) => void;

export type InstructionSpecType = {
    func: InstructionFunction,
    fields: Operand[],
    types: OperandType[],
};

export const InstructionSpec: Map<string, InstructionSpecType> = new Map([
    ["add", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rs] + registers[instr.rt];
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"]
    }],
    ["sub", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rs] - registers[instr.rt];
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"]
    }],
    ["and", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rs] & registers[instr.rt];
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"]
    }],
    ["or", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rs] | registers[instr.rt];
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"]
    }],
    ["xor", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rs] ^ registers[instr.rt];
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"]
    }],
    ["nor", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = ~(registers[instr.rs] | registers[instr.rt]);
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"]
    }],
    ["slt", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = (registers[instr.rs] < registers[instr.rt]) ? 1 : 0;
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"]
    }],
    ["sll", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rt] << instr.shamt;
        },
        fields: ["rd", "rt", "shamt"],
        types: ["Register", "Register", "ShiftAmount"]
    }],
    ["srl", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rt] >> instr.shamt;
        },
        fields: ["rd", "rt", "shamt"],
        types: ["Register", "Register", "ShiftAmount"]
    }],
    // "sra"
    // "sllv",
    // "srlv",
    // "srav",
    ["mult", {
        func: (instr: Instruction): void => {
            // produce a temporary 64-bit product 
            const product = BigInt(registers[instr.rs]) * BigInt(registers[instr.rt]);
            // store the upper 32-bits of the product in $hi
            registers[registerNames.indexOf("$hi")] = Number((product >> BigInt(32)) & BigInt(0xFFFFFFFF));
            // store the lower 32-bits of the product in $lo
            registers[registerNames.indexOf("$lo")] = Number(product & BigInt(0xFFFFFFFF));
        },
        fields: ["rs", "rt"],
        types: ["Register", "Register"]
    }],
    ["div", {
        func: (instr: Instruction): void => {
            registers[registerNames.indexOf("$lo")] = (registers[instr.rs] / registers[instr.rt]) | 0;
            registers[registerNames.indexOf("$hi")] = (registers[instr.rs] % registers[instr.rt]) | 0;
        },
        fields: ["rs", "rt"],
        types: ["Register", "Register"]
    }],
    ["mfhi", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[registerNames.indexOf("$hi")];
        },
        fields: ["rd"],
        types: ["Register"]
    }],
    ["mflo", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[registerNames.indexOf("$lo")];
        },
        fields: ["rd"],
        types: ["Register"]
    }],
    ["addi", {
        func: (instr: Instruction): void => {
            registers[instr.rt] = registers[instr.rs] + instr.imm;
        },
        fields: ["rt", "rs", "imm"],
        types: ["Register", "Register", "Imm16"]
    }],
    ["andi", {
        func: (instr: Instruction): void => {
            registers[instr.rt] = registers[instr.rs] & instr.imm;
        },
        fields: ["rt", "rs", "imm"],
        types: ["Register", "Register", "UImm16"]
    }],
    ["ori", {
        func: (instr: Instruction): void => {
            registers[instr.rt] = registers[instr.rs] | instr.imm;
        },
        fields: ["rt", "rs", "imm"],
        types: ["Register", "Register", "UImm16"]
    }],
    ["xori", {
        func: (instr: Instruction): void => {
            registers[instr.rt] = registers[instr.rs] ^ +instr.imm;
        },
        fields: ["rt", "rs", "imm"],
        types: ["Register", "Register", "UImm16"]
    }],
    ["slti", {
        func: (instr: Instruction): void => {
            registers[instr.rt] = (registers[instr.rs] < instr.imm) ? 1 : 0;
        },
        fields: ["rt", "rs", "imm"],
        types: ["Register", "Register", "Imm16"]
    }],
    // "lui",
    // "lb",
    // "lh",
    // "lw",
    // "sb",
    // "sh",
    // "sw",
    ["beq", {
        func: (instr: Instruction): void => {
            if (registers[instr.rs] === registers[instr.rt]) {
                registers[registerNames.indexOf("$pc")] = instr.imm;
            }
        },
        fields: ["rs", "rt", "imm"],
        types: ["Register", "Register", "Label"]
    }],
    ["bne", {
        func: (instr: Instruction): void => {
            if (registers[instr.rs] !== registers[instr.rt]) {
                registers[registerNames.indexOf("$pc")] = instr.imm;
            }
        },
        fields: ["rs", "rt", "imm"],
        types: ["Register", "Register", "Label"]
    }],
    ["j", {
        func: (instr: Instruction): void => {
            registers[registerNames.indexOf("$pc")] = instr.target;
        },
        fields: ["target"],
        types: ["Label"]
    }],
    ["jr", {
        func: (instr: Instruction): void => {
            registers[registerNames.indexOf("$pc")] = registers[instr.rs];
        },
        fields: ["rs"],
        types: ["Register"]
    }],
    ["jal", {
        func: (instr: Instruction): void => {
            registers[registerNames.indexOf("$ra")] = registers[registerNames.indexOf("$pc")] + 4;
            registers[registerNames.indexOf("$pc")] = instr.target;
        },
        fields: ["target"],
        types: ["Label"]
    }],
    // Pseudos
    ["jalr", {
        func: (instr: Instruction): void => {
            registers[registerNames.indexOf("$ra")] = registers[registerNames.indexOf("$pc")] + 4;
            registers[registerNames.indexOf("$pc")] = registers[instr.rs];
        },
        fields: ["rs"],
        types: ["Register"]
    }],
    ["li", {
        func: (instr: Instruction): void => {
            registers[instr.rs] = instr.imm;
        },
        fields: ["rs", "imm"],
        types: ["Register", "Imm32"]
    }],
    ["la", {
        func: (instr: Instruction): void => {
            registers[instr.rs] = instr.imm;
        },
        fields: ["rs", "imm"],
        types: ["Register", "Label"]
    }],
    ["move", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rs];
        },
        fields: ["rd", "rs"],
        types: ["Register", "Register"]
    }],
    ["mul", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rs] * registers[instr.rt];
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"]
    }]
]);
