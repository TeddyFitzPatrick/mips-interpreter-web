# MIPS Interpreter

A web-based MIPS interpreter with register/memory visualization and line-by-line execution.

## Usage & Limitations

* Supports MIPS (32-bit) assembly, including comments, labels, and the instructions listed below.
* All standard MIPS registers are provided. $zero is read-only and $pc, $hi, and $lo are not directly accessible.
* Data memory is ~8MB, byte-addressable, and big-endian. 
* *dot directives (e.g., .text, .data) are not currently supported.
* *syscall is not currently supported.

## Supported Instructions

**Arithmetic:** `add`, `addu`, `addi`, `addiu`, `sub`

**Logical:** `and`, `or`, `xor`, `nor`, `andi`, `ori`, `xori`

**Comparison:** `slt`, `slti`, `sltu`, `sltiu`

**Shifts:** `sll`, `srl`, `sra`, `sllv`, `srlv`, `srav`

**Multiply/Divide:** `mult`, `div`, `mfhi`, `mflo`

**Memory:** `lb`, `lbu`, `lh`, `lhu`, `lw`, `sb`, `sh`, `sw`

**Branches:** `beq`, `bne`

**Jumps:** `j`, `jr`, `jal`

**Other:** `lui`, `nop`

**Pseudo-instructions:** `li`, `bge`, `ble`

Memory accesses must be aligned for halfwords and words. Misaligned or out-of-bounds accesses produce an error.
