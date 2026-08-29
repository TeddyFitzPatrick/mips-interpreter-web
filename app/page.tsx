"use client";

import { useEffect, useRef, type ChangeEvent} from 'react';
import { EditorView, keymap, lineNumbers, gutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap} from "@codemirror/commands";
import { autocompletion } from "@codemirror/autocomplete";

import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { tags } from "@lezer/highlight"

import { registers, registerNames, updateMemoryViewAddress, updateMemoryView, updateRegisterDisplay, runProgram, stepProgram, resetProgram} from './interpreter';
import autocompletions from './autocomplete'; 
import './globals.css'

export let numberFormat: number = 10; // DEFAULT = Decimal

let textEditor: EditorView;

const defaultCode = `
li $s0, 0
li $s1, 1
li $s2, 2

addi $sp, $sp, -4
sw $s0, 0($sp)
addi $sp, $sp, -4
sw $s1, 0($sp)
addi $sp, $sp, -4
sw $s2, 0($sp)

li $s0, 999
li $s1, 999
li $s2, 999

lw $s2, 0($sp)
addi $sp, $sp, 4
lw $s1, 0($sp)
addi $sp, $sp, 4
lw $s0, 0($sp)
addi $sp, $sp, 4
`;

const myCustomHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#ff79c6", fontWeight: "bold" },
  { tag: tags.comment, color: "#6272a4", fontStyle: "italic" },
  { tag: tags.string, color: "#f1fa8c" },
  { tag: tags.number, color: "#bd93f9" },
  { tag: tags.variableName, color: "#f8f8f2" },
  { tag: tags.operator, color: "#ffb86c" }
])
export const customHighlightExtension = syntaxHighlighting(myCustomHighlightStyle);

function Editor(){
  const editorRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!editorRef.current) throw new Error(`react error : editorRef undefined`);
    const editorCode = localStorage.getItem("storedCode") ?? defaultCode;
    textEditor = new EditorView({
      doc: editorCode,
      extensions: [
        autocompletion({ override: [autocompletions] }),
        customHighlightExtension,
        history(),
        keymap.of(historyKeymap),
        keymap.of(defaultKeymap),
        lineNumbers(),
        gutter({class: "cm-mygutter"}),
        EditorView.updateListener.of((update) => {
          if (update.docChanged){
            localStorage.setItem("storedCode", update.state.doc.toString());
          }
        })
      ],
      parent: editorRef.current
    });

    return () => {
      textEditor.destroy();
      editorRef.current = null;
    }
  }, []);
  return <div ref={editorRef} className="flex w-full h-1/2"></div>;
}

function Button({name, func}: {name: string, func: () => void}){
  return <button onClick={func} className="text-slate-black shadow-2xl px-8 py-4 text-2xl hover:scale-102 bg-color2 font-bold rounded-xl">
    {name}
  </button>
}

function Buttons(){
  return <div className="w-full h-fit py-4 space-x-4 space-y-2 sm:space-y-0">
    <Button name="run" func={() => {
      runProgram(textEditor.state.doc.toString());
      updateRegisterDisplay(numberFormat);
      updateMemoryView();
    }}/>
    <Button name="step" func={() => {
      stepProgram(textEditor.state.doc.toString());
      updateRegisterDisplay(numberFormat);
      updateMemoryView();
    }}/>
    <Button name="reset" func={() => {
      resetProgram()
      updateRegisterDisplay(numberFormat);
      updateMemoryView();
    }}/>
  </div>
}

function RegisterView(){
  const changeNumberFormat = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    numberFormat = Number.parseInt(event.target.value);
    updateRegisterDisplay(numberFormat);
  };

  useEffect(()=>{
    updateRegisterDisplay(numberFormat);
  }, []);

  return (
    <div className="w-full h-full flex bg-color3 p-4 space-y-4 rounded-xl shadow-xl flex-col">
      {/* register data format (default hex) */}
      <div className="w-full flex-col lg:flex-row flex items-center space-x-4">
        <h1 className="text-2xl h-full justify-center font-bold flex">Number System:</h1>
        <select defaultValue={numberFormat} onChange={changeNumberFormat}
          className="text-lg rounded-xl shadow-xl px-4 py-2 bg-color1">
          <option value={2}>Binary</option>
          <option value={10}>Decimal</option>
          <option value={16} >Hexadecimal</option>
        </select>
      </div>

      {/* register values */}
      <ul className="w-full h-fit flex flex-col md:flex-row flex-wrap justify-between space-y-2">
        {Array.from(registers.slice(0,32)).map((_value, index) => (
          <li key={index} className="w-full md:w-[49%] h-fit py-0.5 bg-color2 rounded-xl flex flex-row items-center justify-center space-x-4">
            {/* e.g. $t0 */}
            <h1 className="font-bold text-[110%]">{registerNames[index]}:</h1>
            {/* e.g. 00000000 */}
            <div id={"reg" + index.toString()}  className={
              index === 0 
              ?  "text-[100%] font-bold py-1" 
              : "bg-white text-[100%] py-1 px-2 shadow-xl font-bold w-32 whitespace-nowrap overflow-x-auto scrollbar-none"
            }>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MemoryView(){
  let memorySearchRef = useRef<HTMLInputElement | null>(null);
  let memoryViewRef = useRef<HTMLDivElement | null>(null);

  const lookupMemory = (event: ChangeEvent<HTMLInputElement>) => {
    if (!memorySearchRef.current) return;
    const validatedAddress: string | boolean = updateMemoryViewAddress(event.target.value)
    if (!validatedAddress) return;
    memorySearchRef.current.value = validatedAddress;
    updateMemoryView();
  };

  return <div className="w-full h-full flex bg-color3 p-4 rounded-xl shadow-xl flex-col space-y-2">
    <div>
      <h1 className="text-xl font-bold">Memory View </h1>
      <h1 className="text-lg">(big-endian & addressable from 0 to 8,000,000<sub>dec</sub>)</h1>
    </div>
    <input type="text" 
          id="memorySearch" 
          className="bg-white rounded-xl h-8 w-fit p-5" 
          placeholder={"8000000"}
          ref={memorySearchRef}
          onChange={lookupMemory}>
    </input>
    <div id="memoryView" className="font-bold text-xl" ref={memoryViewRef}>
    </div>
  </div>
}

export default function Page(){
  return <>
  <html>
  <body className="flex flex-col sm:flex-row space-y-6 sm:space-y-0 w-full max-w-screen min-h-screen h-fit bg-color4 p-4 space-x-4 text-slate-800 font-mono">
    <div className="w-full sm:w-1/2 h-full flex flex-col space-y-4">
      {/* Editor  */}
      <div className="flex flex-col w-full h-full rounded-xl bg-color3 p-4 shadow-xl">
        <Editor/> 
        <Buttons/>
      </div>
      {/* Error Output */}
      <div className="bg-color3 w-full h-full rounded-xl shadow-xl p-4 space-y-2">
        <h1 className="font-bold text-xl">
          Simulation Trace
        </h1>
        <div className="w-full h-42 overflow-y-auto flex flex-col font-bold bg-color2 text-xl p-2" id="simulationTrace">
        </div>
      </div>
    </div>

    <div className="flex flex-col w-full sm:w-1/2 h-full space-y-4">
      <RegisterView/>
      <MemoryView/>
    </div>
  </body>
  </html>
  </>
}
