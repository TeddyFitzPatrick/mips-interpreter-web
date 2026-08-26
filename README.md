# MIPS Interpreter

A web-based MIPS interpreter with register/memory visualization and line-by-line execution.

## Usage & Limitations

* Supports the MIPS (32-bit) assembly language, including: comments, labels, and the instructions listed below.
* All standard MIPS registers are provided. $zero is read-only and $pc, $hi, and $lo are not directly accessible.
* Data/Stack memory is byte-addressable, big-endian, ~8MB.
* Instruction and operand autocomplete suggestions can be accepted with Enter.
* *dot directives (e.g., .text, .data) is not currently supported.
* *while the .text segment isn't directly accessible, instructions begin at a virtual address of 0.
* *syscall is not currently supported.

## Supported Instructions

**Arithmetic:** `add`, `addu`, `addi`, `addiu`, `sub`

**Logical:** `and`, `or`, `xor`, `nor`, `andi`, `ori`, `xori`

**Comparison:** `slt`, `slti`

**Shifts:** `sll`, `srl`, `sra`, `sllv`, `srlv`, `srav`

**Multiply/Divide:** `mult`, `div`, `mfhi`, `mflo`

**Memory:** `lb`, `lbu`, `lh`, `lhu`, `lw`, `sb`, `sh`, `sw`

**Branches:** `beq`, `bne`

**Jumps:** `j`, `jr`, `jal`

**Other:** `lui`

**Pseudo-instructions:** `li`

Memory accesses must be aligned for halfwords and words. Misaligned or out-of-bounds accesses produce an error.
