A web interpreter for the MIPS 32-bit assembly language made with TypeScript
https://teddyfitzpatrick.github.io/mips-interpreter-web/

Supported Instructions:  
add  
sub  
and  
or  
xor  
nor  
slt  
sll  
srl  
mult  
div  
mfhi  
mflo  
addi  
andi  
ori  
xori  
slti  
beq  
bne  
lw
sw
j  
jr  
jal  
jalr  
li  
la  
move  
mul  

Limitations:  
Dot derivatives not supported (e.g. .text, .data, .globl)   
Small addressable memory space (~8 MB)
Only interprets a single form of each instruction (e.g. j label_name vs. j 24)
Stricter label names and argument forms

Note:
If you encounter any bugs or have features you would like added, create a GitHub issue

Packages required for development:  
npm install vite  
npm install tailwindcss @tailwindcss/vite  
