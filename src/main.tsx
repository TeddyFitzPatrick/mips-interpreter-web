import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { EditorView, keymap, lineNumbers, gutter } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { registers, registerLabels, updateRegisterDisplay, runProgram, resetProgram} from './interpreter.ts';
import './index.css'
let textEditor: EditorView;

export let numberFormat: number = 16;

function Editor(){
  const editorRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!editorRef.current) return;
    textEditor = new EditorView({
      doc: "li $t0, 1\nadd $t1, $t0, $t0\n# $t0 = 1, $t1 = 2",
      extensions: [keymap.of(defaultKeymap), lineNumbers(), gutter({class: "cm-mygutter"})],
      parent: editorRef.current
    });
  });
  return <div ref={editorRef} className="flex w-full h-1/2 bg-slate-400 rounded-xl p-6"></div>;
}

function Button({name, func}: {name: string, func: () => void}){
  return <button onClick={func} className="border-4 shadow-2xl border-black px-8 py-4 text-2xl font-extrabold hover:scale-102 bg-cyan-500 rounded-xl">
    {name}
  </button>
}

function Buttons(){
  return <div className="w-full h-fit py-4">
    <Button name="run" func={() => {runProgram(textEditor.state.doc.toString())}}/>
    <Button name="step" func={() => {return;}}/>
    <Button name="reset" func={() => {resetProgram()}}/>
  </div>
}

function RegisterView(){
  const changeNumberFormat = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    numberFormat = Number.parseInt(event.target.value);
    updateRegisterDisplay();
  };
  return (
    <div className="w-1/2 h-full flex bg-slate-900 p-4 rounded-xl shadow-xl flex-col">
      {/* register data format (default hex) */}
      <div className="bg-white shadow-xl rounded-xl my-4 w-full p-4 flex flex-col lg:flex-row">
        <h1 className="text-2xl font-extrabold h-full justify-center flex">Number System:</h1>
        <select defaultValue={16} onChange={changeNumberFormat}
          className="text-xl font-bold border-2 border-black rounded-xl shadow-xl ml-2 px-4 py-2">
          <option value={2}>Binary</option>
          <option value={8}>Octal</option>
          <option value={10}>Decimal</option>
          <option value={16} >Hexadecimal</option>
        </select>
      </div>

      {/* register values */}
      <ul className="w-full h-fit flex flex-col md:flex-row flex-wrap ">
        {Array.from(registers).map((_value, index) => (
          <li key={index} className="w-full md:w-1/2 h-fit bg-slate-400 rounded-xl p-2 border-4 border-black flex flex-row justify-around">
            {/* e.g. $t0  */}
            <h1 className="font-extrabold text-[100%]">{registerLabels[index]}:</h1>
            {/* e.g. 00000000 */}
            <div id={"reg" + index.toString()}  className="bg-white text-[100%] rounded-xl py-1 px-2 shadow-xl font-extrabold truncate">
              ...
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <div className="flex flex-row w-screen max-w-screen min-h-screen h-fit bg-green-800 p-4 lg:p-12 space-x-4">
    <div className="flex flex-col w-1/2 h-full rounded-xl bg-slate-900 p-4 shadow-xl">
      <Editor/> 
      <Buttons/>
    </div>
    <RegisterView/>
  </div>
)
