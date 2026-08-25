import { describe, it, expect } from "vitest";

import { registers, registerNames, runProgram, errorText } from "../app/interpreter";
import { UNALIGNED_MEM_ACC_ERROR, SEG_FAULT_ERROR } from "../app/instructions";


describe('registers', () => {
    it('$zero is immutable', () => {
        const program = `
            addi $zero, $zero, 1
            addi $t0, $t0, 1
        `;
        runProgram(program);
        expect(registers[registerNames.indexOf('$zero')]).toBe(0);
        expect(registers[registerNames.indexOf('$t0')]).toBe(1);
    });
});

describe('memory instructions', () => {
    it('memory access above upper bound', () => {
        const program = `
            li $t1, 0xFFFFFFF0
            lw $t0, 3($t1)
        `;
        runProgram(program);
        expect(errorText).toBe(SEG_FAULT_ERROR);
    });
    it('memory access below lower bound', () => {
        const program = `
            li $t1, 0x0
            lw $t0, -1($t1)
        `;
        runProgram(program);
        expect(errorText).toBe(SEG_FAULT_ERROR);
    });
    it('unaligned memory access (lw)', () => {
        const program = `
            addi $sp, $sp, -4    
            lw $t0, 2($sp)
        `;
        runProgram(program);
        expect(errorText).toBe(UNALIGNED_MEM_ACC_ERROR);
    });
    it('unaligned memory access (lh)', () => {
        const program = `
            addi $sp, $sp, -4    
            lh $t0, 3($sp)
        `;
        runProgram(program);
        expect(errorText).toBe(UNALIGNED_MEM_ACC_ERROR);   
    })
    it('unaligned memory access (sw)', () => {
        const program = `
            addi $sp, $sp, -4    
            lh $t0, 3($sp)
        `;
        runProgram(program);
        expect(errorText).toBe(UNALIGNED_MEM_ACC_ERROR);   
    })
    it('unaligned memory access (sh)', () => {
        const program = `
            addi $sp, $sp, -4    
            lh $t0, 3($sp)
        `;
        runProgram(program);
        expect(errorText).toBe(UNALIGNED_MEM_ACC_ERROR);   
    })
});

// describe('add instruction', () => {
//   it('overflow', () => {
//     const program = `
//         li $t0, 0xFFFFFFFF
//         li $t1, 0xFFFFFFFF
//         add $t2, $t0, $t1
//     `;  

//     runProgram(program)

//     expect(registers[registerNames.indexOf('$t0')]).toBe(0xFFFFFFFF)
//     expect(registers[registerNames.indexOf('$t1')]).toBe(0xFFFFFFFF)
//     expect(registers[registerNames.indexOf('$t2')]).toBe(0xFFFFFFFE)
//   });

//   it('underflow', ()=>{
//   });
// });