import { registerNames } from "./interpreter";
import { CompletionContext, Completion, CompletionResult } from "@codemirror/autocomplete";
import { InstructionCategory, InstructionSpec, InstructionSpecType, Operand, OperandType,  } from "./instructions";
import { parseLabels, minify } from "./interpreter";

export default function autocompletions(context: CompletionContext): CompletionResult {
  const line = context.state.doc.lineAt(context.pos);
  const before = line.text.slice(0, context.pos - line.from);
  const argCount = before.split(",").length - 1;
  const firstLineToken = before.split(" ")[0];
  const currentInstruction = InstructionSpec.get(firstLineToken) ?? undefined;
  const word = context.matchBefore(/\$?\w*/);

  // console.log(`before: ${before} / currInstr: ${currentInstruction?.fields} / word: ${word}`)
  const programText = context.state.doc.toString();
  const symtab = new Map<string, number>([]);
  parseLabels(minify(programText.split("\n")), symtab, true);
  const labels = symtab.keys() 

  // Don't show autocompletion options
  if ((!word && !context.explicit) || (word && !word.text && currentInstruction === undefined)) 
    return {from: context.pos, options: [], filter: true};
  
  // register name autocompletes
  const registerAutocompletes: Completion[] = [];
  for (let i = 0; i < 32; i++){
    const registerAutocomplete = {
      label: `${registerNames[i]}`,
      type: "variable",
      detail: `: Register`,
      apply: (currentInstruction !== undefined && argCount < currentInstruction?.fields.length - 1)
      ? `${registerNames[i]}, `
      : `${registerNames[i]}\n`
    }
    registerAutocompletes.push(registerAutocomplete)
  }

  // instruction name autocompletes
  const instrAutocompletes: Completion[] = [];
  for (const instr of InstructionSpec){
    const name: string = instr[0]; 
    const spec: InstructionSpecType = instr[1];
    const fields: Operand[] = spec.fields;
    const types: OperandType[] = spec.types;
    const category: InstructionCategory = spec.category;
    const instrAutocomplete: Completion = {
      label: `${name}`,
      type: `function`,
      detail: `=> ${name}/${fields.length} [${fields.map((field: Operand, i: number) => {
        const argType = types[i];
        return `${field} (${argType})`;
      }).join(", ")}] (${category.toUpperCase()})`,
      apply: `${name} `
    }
    instrAutocompletes.push(instrAutocomplete);
  }

  // label name autocompletes
  const labelAutocompletes: Completion[] = [];
  for (const label of labels){
    const labelAutocomplete: Completion = {
      label: `${label}`,
      type: `constant`,
      detail: `: Label`,
      apply: (currentInstruction !== undefined && argCount < currentInstruction?.fields.length - 1)
      ? `${label}, `
      : `${label}\n`
    }
    labelAutocompletes.push(labelAutocomplete);
  }

  let options: Completion[] = [];
  if (currentInstruction === undefined || line.text.indexOf(" ") === -1){
    options = instrAutocompletes;
  } else if (currentInstruction && argCount < currentInstruction.fields.length) {
    const types: OperandType[] = currentInstruction.types;
    switch (types[argCount]){
      case "Register":
        options = registerAutocompletes;
        break;
      case "Label":
        options = labelAutocompletes;
        break;
    }
  }

  return {
    from: word ? word.from : context.pos,
    options: options,
    filter: true 
  };
}
