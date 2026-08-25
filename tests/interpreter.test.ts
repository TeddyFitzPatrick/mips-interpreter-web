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
    it('aligned memory access (lb & sb)', () => {
        const program = `
            addi $sp, $sp, -4
            li $t0, 0x7F
            sb $t0, 1($sp)
            lb $t1, 1($sp)
        `;
        runProgram(program);
        expect(registers[registerNames.indexOf(`$t1`)]).toBe(0x7F);
    });
    it('lb and lh sign-extend', () => {
        const program = `
            addi $sp, $sp, -40
            # lb sign-extend non-negative number
            li $t0, 0x7F
            sb $t0, 1($sp)
            lb $t9, 1($sp)
            # $t9 = 0x7F
            # lb sign-extend negative number
            addi $sp, $sp, 4
            li $t0, 0xFF
            sb $t0, 1($sp)
            lb $t8, 1($sp)
            # $t8 = 0xFFFFFFFF
            # lh sign-extend non-negative number
            addi $sp, $sp, 4
            li $t0, 0x7FFF
            sh $t0, 2($sp)
            lh $t7, 2($sp)
            # $t7 = 0x7FFF
            # lh sign-extend negative number
            addi $sp, $sp, 4
            li $t0, 0xFFFF
            sh $t0, 2($sp)
            lh $t6, 2($sp)
            # $t6 = 0xFFFFFFFF
        `;
        runProgram(program);
        expect(registers[registerNames.indexOf('$t9')]).toBe(0x7F);
        expect(registers[registerNames.indexOf('$t8')]).toBe(0xFFFFFFFF);
        expect(registers[registerNames.indexOf('$t7')]).toBe(0x7FFF);
        expect(registers[registerNames.indexOf('$t6')]).toBe(0xFFFFFFFF);
    });
    it("lbu and lhu don't sign extend", () => {
        const program = `
            addi $sp, $sp, -40
            # lbu non-negative number
            li $t0, 0x7F
            sb $t0, 1($sp)
            lbu $t9, 1($sp)
            # $t9 = 0x7F
            # lbu negative number
            addi $sp, $sp, 4
            li $t0, 0xFF
            sb $t0, 1($sp)
            lbu $t8, 1($sp)
            # $t8 = 0xFF
            # lhu non-negative number
            addi $sp, $sp, 4
            li $t0, 0x7FFF
            sh $t0, 2($sp)
            lhu $t7, 2($sp)
            # $t7 = 0x7FFF
            # lhu negative number
            addi $sp, $sp, 4
            li $t0, 0xFFFF
            sh $t0, 2($sp)
            lhu $t6, 2($sp)
            # $t6 = 0xFFFF
        `;
        runProgram(program);
        expect(registers[registerNames.indexOf('$t9')]).toBe(0x7F);
        expect(registers[registerNames.indexOf('$t8')]).toBe(0xFF);
        expect(registers[registerNames.indexOf('$t7')]).toBe(0x7FFF);
        expect(registers[registerNames.indexOf('$t6')]).toBe(0xFFFF);
    });
});

// describe('pseudo expansion', () => {
    // it('li expands to addiu for 16-bit numbers', () => {
        // const program = `

        // `;
        // runProgram(program);
    // });
    // it('li expands to lui and ori for >16-bit numbers', () => {
        // const program = `
        // 
        // `;
        // runProgram(program);
    // });
// });


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