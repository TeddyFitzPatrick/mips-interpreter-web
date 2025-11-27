import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// codemirror
import {EditorView, keymap, lineNumbers, gutter} from "@codemirror/view"
import {defaultKeymap} from "@codemirror/commands"
let textEditor: EditorView;
// interpreter
import { registers, getRegisterOutput, registerLabels, runProgram, HEX} from './interpreter.ts';

function Editor(){
  const editorRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!editorRef.current) return;
    textEditor = new EditorView({
      doc: "li $t0, 1\nadd $t1, $t0, $t0\n",
      extensions: [keymap.of(defaultKeymap), lineNumbers(), gutter({class: "cm-mygutter"})],
      parent: editorRef.current
    });
  });
  return <div ref={editorRef} className="flex w-full h-1/2 bg-slate-400 rounded-xl p-6"></div>;
}

function Buttons(){
  const run = () => {
    runProgram(textEditor.state.doc.toString());
    return;
  };
  return <div className="w-full h-fit  py-4">
    <button onClick={run} className="border-4 shadow-2xl border-black px-8 py-4 text-2xl font-extrabold hover:scale-102 bg-cyan-500 rounded-xl">
      run
    </button>
    {/* <button className="border-2 border-black px-8 py-4 text-2xl font-extrabold hover:scale-102 bg-cyan-500 rounded-xl">...</button>
    <button className="border-2 border-black px-8 py-4 text-2xl font-extrabold hover:scale-102 bg-cyan-500 rounded-xl">...</button> */}
  </div>
}

function RegisterView(){
  return (
    <div className="w-1/2 h-full flex bg-slate-900 p-4 rounded-xl shadow-xl flex-col">
      {/* register data format */}
      <div className="bg-white shadow-xl rounded-xl my-4 w-full p-4 flex flex-row">
        <h1 className="text-2xl font-extrabold h-full justify-center flex">Number System:</h1>
        <select defaultValue="HEX" id="dataFormat" className="text-xl font-bold border-2 border-black rounded-xl shadow-xl ml-2 px-4 py-2">
          <option value="BIN">Binary</option>
          <option value="OCTAL">Octal</option>
          <option value="DEC">Decimal</option>
          <option value="HEX" >Hexadecimal</option>
        </select>
      </div>

      {/* register values */}
      <ul className="w-full h-fit flex flex-row flex-wrap space-y-2">
        {Array.from(registers).map((_value, index) => (
          <li key={index} className="w-1/2 h-fit bg-slate-400 rounded-xl p-2 border-2 border-black text-2xl flex flex-row justify-around">
            <h1 className="font-extrabold text-3xl">{registerLabels[index]}:</h1>
            <div className="bg-white rounded-xl py-1 px-2 shadow-xl border-4 border-black font-extrabold">
              {getRegisterOutput(index, HEX)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <div className="flex flex-row w-screen max-w-full h-screen max-h-screen bg-green-800 p-12 space-x-4">
    <div className="flex flex-col w-1/2 h-full rounded-xl bg-slate-900 p-4 shadow-xl">
      <Editor/> 
      <Buttons/>
    </div>
    <RegisterView/>
  </div>
)
