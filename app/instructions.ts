import { registers, registerNames, DataMemory, DATA_MEM_SIZE, isImm16 } from "./interpreter";

// error messages
export const UNALIGNED_MEM_ACC_ERROR = 'Address Error (Unaligned Memory Access)';
export const SEG_FAULT_ERROR = 'Segmentation Fault (Out-of-bounds Memory Access)';

export type Instruction = {
  name: string,    // opcode                     (6-bits)
  rs: number,      // source 1 register          (5-bits)
  rt: number,      // source 2 register          (5-bits)
  rd: number,      // destination register       (5-bits)
  shamt: number,   // shift amount               (5-bits)
  imm: number,     // imm/addr of an I-type      (16-bits)
  target: number   // 26-bit J-type addr         (26-bits)
};

export const MemoryInstructions: string[] = [
    "lb",
    "lbu", 
    "lh",
    "lhu",
    "lw",
    "sb",
    "sh",
    "sw"
];

export type Operand = keyof Omit<Instruction, "name">;

export type OperandType = 
    | "Register" 
    | "UImm16" 
    | "Imm16" 
    | "UImm32" 
    | "Imm32" 
    | "ShiftAmount" 
    | "Label";

export type InstructionFunction = (instr: Instruction) => void;

export type InstructionCategory = 
    | 'native'
    | 'pseudo';

export type InstructionSpecType = {
    func: InstructionFunction,
    fields: Operand[],
    types: OperandType[],
    category: InstructionCategory
};

export const InstructionSpec: Map<string, InstructionSpecType> = new Map([
    ["add", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rs] + registers[instr.rt];
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"],
        category: 'native'
    }],
    ["addu", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = (registers[instr.rs] + registers[instr.rt]) | 0;
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"],
        category: 'native'
    }],
    ["addiu", {
        func: (instr: Instruction): void => {
            registers[instr.rt] = (registers[instr.rs] + instr.imm) | 0;
        },
        fields: ["rt", "rs", "imm"],
        types: ["Register", "Register", "Imm16"],
        category: 'native'
    }],
    ["sub", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rs] - registers[instr.rt];
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"],
        category: 'native'
    }],
    ["and", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rs] & registers[instr.rt];
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"],
        category: 'native'
    }],
    ["or", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rs] | registers[instr.rt];
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"],
        category: 'native'
    }],
    ["xor", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rs] ^ registers[instr.rt];
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"],
        category: 'native'
    }],
    ["nop", {
        func: (instr: Instruction): void => {
            // execute the nop (no operation)
        },
        fields: [],
        types: [],
        category: 'native'
    }],
    ["nor", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = ~(registers[instr.rs] | registers[instr.rt]);
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"],
        category: 'native'
    }],
    ["slt", {
        func: (instr: Instruction): void => {
            const rs = registers[instr.rs] | 0;
            const rt = registers[instr.rt] | 0;
            registers[instr.rd] = rs < rt ? 1 : 0;
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"],
        category: 'native'
    }],
    ["slti", {
        func: (instr: Instruction): void => {
            const rs = registers[instr.rs] | 0;
            const imm = instr.imm | 0;
            registers[instr.rt] = rs < imm ? 1 : 0;
        },
        fields: ["rt", "rs", "imm"],
        types: ["Register", "Register", "Imm16"],
        category: 'native'
    }],
    ["sltu", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = (registers[instr.rs] < registers[instr.rt]) ? 1 : 0;
        },
        fields: ["rd", "rs", "rt"],
        types: ["Register", "Register", "Register"],
        category: 'native'
    }],
    ["sltiu", {
        func: (instr: Instruction): void => {
            const rs = registers[instr.rs] >>> 0;
            const imm = instr.imm >>> 0;
            registers[instr.rt] = rs < imm ? 1 : 0;
        },
        fields: ["rt", "rs", "imm"],
        types: ["Register", "Register", "Imm16"],
        category: 'native'
    }],
    ["sll", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rt] << instr.shamt;
        },
        fields: ["rd", "rt", "shamt"],
        types: ["Register", "Register", "ShiftAmount"],
        category: 'native'
    }],
    ["srl", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rt] >>> instr.shamt;
            },
        fields: ["rd", "rt", "shamt"],
        types: ["Register", "Register", "ShiftAmount"],
        category: 'native'
    }],
    ["sra", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rt] >> instr.shamt;
        },
        fields: ["rd", "rt", "shamt"],
        types: ["Register", "Register", "ShiftAmount"],
        category: 'native'
    }],
    ["sllv", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rt] << registers[instr.rs];
        },
        fields: ["rd", "rt", "rs"],
        types: ["Register", "Register", "Register"],
        category: 'native'
    }],
    ["srlv", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[instr.rt] >>> registers[instr.rs];
        },
        fields: ["rd", "rt", "rs"],
        types: ["Register", "Register", "Register"],
        category: 'native'
    }],
    ["srav", {
        func: (instr: Instruction): void => {
            registers[instr.rd]= registers[instr.rt] >> registers[instr.rs];
        },
        fields: ["rd", "rt", "rs"],
        types: ["Register", "Register", "Register"],
        category: 'native'
    }],
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
        types: ["Register", "Register"],
        category: 'native'
    }],
    ["div", {
        func: (instr: Instruction): void => {
            registers[registerNames.indexOf("$lo")] = (registers[instr.rs] / registers[instr.rt]) | 0;
            registers[registerNames.indexOf("$hi")] = (registers[instr.rs] % registers[instr.rt]) | 0;
        },
        fields: ["rs", "rt"],
        types: ["Register", "Register"],
        category: 'native'
    }],
    ["mfhi", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[registerNames.indexOf("$hi")];
        },
        fields: ["rd"],
        types: ["Register"],
        category: 'native'
    }],
    ["mflo", {
        func: (instr: Instruction): void => {
            registers[instr.rd] = registers[registerNames.indexOf("$lo")];
        },
        fields: ["rd"],
        types: ["Register"],
        category: 'native'
    }],
    ["addi", {
        func: (instr: Instruction): void => {
            registers[instr.rt] = registers[instr.rs] + instr.imm;
        },
        fields: ["rt", "rs", "imm"],
        types: ["Register", "Register", "Imm16"],
        category: 'native'
    }],
    ["andi", {
        func: (instr: Instruction): void => {
            registers[instr.rt] = registers[instr.rs] & instr.imm;
        },
        fields: ["rt", "rs", "imm"],
        types: ["Register", "Register", "UImm16"],
        category: 'native'
    }],
    ["ori", {
        func: (instr: Instruction): void => {
            registers[instr.rt] = registers[instr.rs] | instr.imm;
        },
        fields: ["rt", "rs", "imm"],
        types: ["Register", "Register", "UImm16"],
        category: 'native'
    }],
    ["xori", {
        func: (instr: Instruction): void => {
            registers[instr.rt] = registers[instr.rs] ^ +instr.imm;
        },
        fields: ["rt", "rs", "imm"],
        types: ["Register", "Register", "UImm16"],
        category: 'native'
    }],
    ["slti", {
        func: (instr: Instruction): void => {
            registers[instr.rt] = (registers[instr.rs] < instr.imm) ? 1 : 0;
        },
        fields: ["rt", "rs", "imm"],
        types: ["Register", "Register", "Imm16"],
        category: 'native'
    }],
    ["lui", {
        func: (instr: Instruction): void => {
            registers[instr.rt] = ((instr.imm | 0) << 16);
        },
        fields: ["rt", "imm"],
        types: ["Register", "UImm16"],
        category: 'native'
    }],
    ["lb", {
        func: (instr: Instruction): void => {
            const effectiveAddress = getEffectiveAddress(registers[instr.rs], instr.imm);
            // (>> is arithmetic - sign extends by default)
            registers[instr.rt] = (DataMemory[effectiveAddress] << 24) >> 24;
        },
        fields: ["rt", "imm", "rs"],
        types: ["Register", "Imm16", "Register"],
        category: 'native'
    }],
    ["lbu", {
        func: (instr: Instruction): void => {
            const effectiveAddress = getEffectiveAddress(registers[instr.rs], instr.imm);
            registers[instr.rt] = (DataMemory[effectiveAddress] & 0xFF);
        },
        fields: ["rt", "imm", "rs"],
        types: ["Register", "Imm16", "Register"],
        category: 'native'
    }],
    ["lh", {
        func: (instr: Instruction): void => {
            const effectiveAddress = getEffectiveAddress(registers[instr.rs], instr.imm);
            if (effectiveAddress % 2 !== 0) throw new Error(UNALIGNED_MEM_ACC_ERROR);
            const halfword = (DataMemory[effectiveAddress] << 8) | DataMemory[effectiveAddress + 1];
            // sign-extend the halfword
            registers[instr.rt] = (halfword << 16) >> 16;
        },
        fields: ["rt", "imm", "rs"],
        types: ["Register", "Imm16", "Register"],
        category: 'native'
    }],
    ["lhu", {
        func: (instr: Instruction): void => {
            const effectiveAddress = getEffectiveAddress(registers[instr.rs], instr.imm);
            if (effectiveAddress % 2 !== 0) throw new Error(UNALIGNED_MEM_ACC_ERROR);
            const halfword = (DataMemory[effectiveAddress] << 8) | DataMemory[effectiveAddress + 1];
            registers[instr.rt] = (halfword & 0xFFFF);
        },
        fields: ["rt", "imm", "rs"],
        types: ["Register", "Imm16", "Register"],
        category: 'native'
    }],
    ["lw", {
        func: (instr: Instruction): void => {            
            const effectiveAddress = getEffectiveAddress(registers[instr.rs], instr.imm);
            if (effectiveAddress % 4 !== 0) throw new Error(UNALIGNED_MEM_ACC_ERROR);
            registers[instr.rt] = (DataMemory[effectiveAddress] << 24)
                | (DataMemory[effectiveAddress + 1] << 16)
                | (DataMemory[effectiveAddress + 2] << 8)
                | (DataMemory[effectiveAddress + 3]
            ) | 0;
        },
        fields: ["rt", "imm", "rs"],
        types: ["Register", "Imm16", "Register"],
        category: 'native'
    }],
    ["sb", {
        func: (instr: Instruction): void => {
            const effectiveAddress = getEffectiveAddress(registers[instr.rs], instr.imm);
            DataMemory[effectiveAddress] = (registers[instr.rt] & 0xFF);
        },
        fields: ["rt", "imm", "rs"],
        types: ["Register", "Imm16", "Register"],
        category: 'native'
    }],
    ["sh", {
        func: (instr: Instruction): void => {
            const effectiveAddress = getEffectiveAddress(registers[instr.rs], instr.imm);
            if (effectiveAddress % 2 !== 0) throw new Error(UNALIGNED_MEM_ACC_ERROR);
            DataMemory[effectiveAddress] = (registers[instr.rt] & 0xFF00) >>> 8;
            DataMemory[effectiveAddress + 1] = (registers[instr.rt] & 0xFF); 
        }, 
        fields: ["rt", "imm", "rs"],
        types: ["Register", "Imm16", "Register"],
        category: 'native'
    }],
    ["sw", {
        func: (instr: Instruction): void => {
            const effectiveAddress = getEffectiveAddress(registers[instr.rs], instr.imm);
            if (effectiveAddress % 4 !== 0) throw new Error(UNALIGNED_MEM_ACC_ERROR);
            // bits 31-24 (most significant bits)
            DataMemory[effectiveAddress] = (registers[instr.rt] & 0xFF000000) >>> 24;
            DataMemory[effectiveAddress + 1] = (registers[instr.rt] & 0xFF0000) >>> 16;
            DataMemory[effectiveAddress + 2] = (registers[instr.rt] & 0xFF00) >>> 8;
            // bits 7-0 (least significant bits)
            DataMemory[effectiveAddress + 3] = (registers[instr.rt] & 0xFF)
        },
        fields: ["rt", "imm", "rs"],
        types: ["Register", "Imm16", "Register"],
        category: 'native'
    }],
    ["beq", {
        func: (instr: Instruction): void => {
            if (registers[instr.rs] === registers[instr.rt]) {
                registers[registerNames.indexOf("$pc")] = instr.imm;
            }
        },
        fields: ["rs", "rt", "imm"],
        types: ["Register", "Register", "Label"],
        category: 'native'
    }],
    ["bne", {
        func: (instr: Instruction): void => {
            if (registers[instr.rs] !== registers[instr.rt]) {
                registers[registerNames.indexOf("$pc")] = instr.imm;
            }
        },
        fields: ["rs", "rt", "imm"],
        types: ["Register", "Register", "Label"],
        category: 'native'
    }],
    ["j", {
        func: (instr: Instruction): void => {
            registers[registerNames.indexOf("$pc")] = instr.target;
        },
        fields: ["target"],
        types: ["Label"],
        category: 'native'
    }],
    ["jr", {
        func: (instr: Instruction): void => {
            registers[registerNames.indexOf("$pc")] = registers[instr.rs];
        },
        fields: ["rs"],
        types: ["Register"],
        category: 'native'
    }],
    ["jal", {
        func: (instr: Instruction): void => {
            registers[registerNames.indexOf("$ra")] = registers[registerNames.indexOf("$pc")] + 4;
            registers[registerNames.indexOf("$pc")] = instr.target;
        },
        fields: ["target"],
        types: ["Label"],
        category: 'native'
    }],
    // Pseudos
    ["bge", {
        func: (instr: Instruction): void => {},
        fields: ["rs", "rt", "imm"],
        types: ["Register", "Register", "Label"],
        category: 'pseudo'
    }],
    ["ble", {
        func: (instr: Instruction): void => {},
        fields: ["rs", "rt", "imm"],
        types: ["Register", "Register", "Label"],
        category: 'pseudo'
    }],
    // ["jalr", {
    //     func: (instr: Instruction): void => {
    //         registers[registerNames.indexOf("$ra")] = registers[registerNames.indexOf("$pc")] + 4;
    //         registers[registerNames.indexOf("$pc")] = registers[instr.rs];
    //     },
    //     fields: ["rs"],
    //     types: ["Register"],
    //     category: 'pseudo'
    // }],
    ["li", {
        func: (instr: Instruction): void => {},
        fields: ["rt", "imm"],
        types: ["Register", "UImm32"],
        category: 'pseudo'
    }],
    // ["la", {
    //     func: (instr: Instruction): void => {
    //         registers[instr.rs] = instr.imm;
    //     },
    //     fields: ["rs", "imm"],
    //     types: ["Register", "Label"],
    //     category: 'pseudo'
    // }],
    // ["move", {
    //     func: (instr: Instruction): void => {
    //         registers[instr.rd] = registers[instr.rs];
    //     },
    //     fields: ["rd", "rs"],
    //     types: ["Register", "Register"],
    //     category: 'pseudo'
    // }],
    // ["mul", {
    //     func: (instr: Instruction): void => {
    //         registers[instr.rd] = registers[instr.rs] * registers[instr.rt];
    //     },
    //     fields: ["rd", "rs", "rt"],
    //     types: ["Register", "Register", "Register"],
    //     category: 'pseudo'
    // }]
]);

export const expandPseudoInstruction = (pseudoInstruction: Instruction): Instruction[] => {
    const spec = InstructionSpec.get(pseudoInstruction.name);
    if (!spec) throw new Error(`Pseudo expansion failed because pseudo-instruction ${pseudoInstruction.name} doesn't exist`);
    if (spec.category !== "pseudo") throw new Error('Native instruction was passed to expandPseudoInstruction');
    const nativeInstructions: Instruction[] = [];

    switch (pseudoInstruction.name){
        case "li":
            const immediateValue = pseudoInstruction.imm;
            if (isImm16(`${immediateValue}`)){
                nativeInstructions.push({name: "addiu", rt: pseudoInstruction.rt, rs: 0, imm: immediateValue, rd: -1, shamt: -1, target: -1});
            } else {
                nativeInstructions.push({name: "lui", rt: pseudoInstruction.rt, imm: (immediateValue >>> 16), rs: -1, rd: -1, shamt: -1, target: -1});
                nativeInstructions.push({name: "ori", rt: pseudoInstruction.rt, rs: pseudoInstruction.rt, imm: immediateValue & 0xFFFF, rd: -1, shamt: -1, target: -1});
            }
            break;
        case "bge":
            nativeInstructions.push({name: "slt", rd: registerNames.indexOf(`$at`), rs: pseudoInstruction.rs, rt: pseudoInstruction.rt, imm: -1, shamt: -1, target: -1});
            nativeInstructions.push({name: "beq", rs: registerNames.indexOf(`$at`), rt: 0, imm: pseudoInstruction.imm, rd: -1, shamt: -1, target: -1});
            break;
        case "ble":
            nativeInstructions.push({name: "slt", rd: registerNames.indexOf(`$at`), rs: pseudoInstruction.rt, rt: pseudoInstruction.rs, imm: -1, shamt: -1, target: -1});
            nativeInstructions.push({name: "beq", rs: registerNames.indexOf(`$at`), rt: 0, imm: pseudoInstruction.imm, rd: -1, shamt: -1, target: -1});
            break;
    }
    return nativeInstructions;
}

const getEffectiveAddress = (base: number, offset: number): number => {
    const effectiveAddress = base + offset;
    if (effectiveAddress < 0 || effectiveAddress > DATA_MEM_SIZE - 4) throw new Error(SEG_FAULT_ERROR);
    return effectiveAddress;
};

export const instrToString = (instr: Instruction): string => {
    let instrString = instr.name + " ";
    const spec = InstructionSpec.get(instr.name);
    if (spec === undefined) throw new Error('Error getting instruction spec while converting to log output string');
    for (let i = 0; i < spec.fields.length; i++){
        const field = spec.fields[i];
        const fieldType = spec.types[i];
        instrString += (fieldType === "Register") ? `${registerNames[instr[field]]}` : String(instr[field]);
        if (i !== spec.fields.length - 1) instrString += ", "
    }
    return instrString;
};