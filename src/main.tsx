import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { EditorView, keymap, lineNumbers, gutter } from "@codemirror/view"
import { defaultKeymap } from "@codemirror/commands"
import { registers, registerNames, updateRegisterDisplay, runProgram, resetProgram} from './interpreter.ts';
import './index.css'
let textEditor: EditorView;

export let numberFormat: number = 10; // DEFAULT = Decimal

const defaultCode = `start:
  li    $a0, 5
  jal   fac       # calculate 5! -> 120
  move  $s0, $v0
  j     done
fac:
  li    $v0, 1
  # 0! = 1! = 1 base case
  beq   $a0, $v0, fac_done
  beq   $a0, $zero, fac_done
fac_loop:
  mul   $v0, $v0, $a0
  addi  $a0, $a0, -1
  bne   $a0, $zero, fac_loop
fac_done: 
  jr    $ra
done:
  # $s0 will store 5! = 120`;

function Editor(){
  const editorRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!editorRef.current) return;
    textEditor = new EditorView({
      doc: defaultCode,
      extensions: [keymap.of(defaultKeymap), lineNumbers(), gutter({class: "cm-mygutter"})],
      parent: editorRef.current
    });
  });
  return <div ref={editorRef} className="flex w-full h-1/2"></div>;
}

function Button({name, func}: {name: string, func: () => void}){
  return <button onClick={func} className="text-slate-black shadow-2xl px-8 py-4 text-2xl hover:scale-102 bg-color2 font-bold rounded-xl">
    {name}
  </button>
}

function Buttons(){
  return <div className="w-full h-fit py-4 space-x-4 space-y-2 sm:space-y-0">
    <Button name="run" func={() => {runProgram(textEditor.state.doc.toString())}}/>
    {/* <Button name="step" func={() => {return;}}/> */}
    <Button name="reset" func={() => {resetProgram()}}/>
  </div>
}

function RegisterView(){
  const changeNumberFormat = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    numberFormat = Number.parseInt(event.target.value);
    updateRegisterDisplay();
  };

  return (
    <div className="w-full sm:w-1/2 h-full flex bg-color3 p-4 rounded-xl shadow-xl flex-col">
      {/* register data format (default hex) */}
      <div className="bg-color2 shadow-xl rounded-xl my-4 w-full p-4 flex-col lg:flex-row flex items-center justify-center space-x-4">
        <h1 className="text-2xl h-full text-center justify-center font-bold it flex">Number System:</h1>
        <select defaultValue={numberFormat} onChange={changeNumberFormat}
          className="text-xl  rounded-xl shadow-xl ml-2 px-4 py-2 bg-color1">
          <option value={2}>Binary</option>
          <option value={8}>Octal</option>
          <option value={10}>Decimal</option>
          <option value={16} >Hexadecimal</option>
        </select>
      </div>

      {/* register values */}
      <ul className="w-full h-fit flex flex-col md:flex-row flex-wrap justify-between space-y-2">
        {Array.from(registers).map((_value, index) => (
          <li key={index} className="w-full md:w-[49%] h-fit bg-color2 rounded-xl p-1 flex flex-row items-center justify-center space-x-4">
            {/* e.g. $t0 */}
            <h1 className="font-extrabold text-[100%]">{registerNames[index]}:</h1>
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

const root = document.getElementById("root");
if (root !== undefined && root !== null && !root.hasChildNodes()){
  createRoot(document.getElementById('root')!).render(
    <div className="flex flex-col sm:flex-row space-y-6 sm:space-y-0 w-full max-w-screen min-h-screen h-fit bg-color4 p-4 space-x-4 text-slate-800">
      <div className="w-full sm:w-1/2 h-full flex flex-col space-y-4">
        {/* Editor  */}
        <div className="flex flex-col w-full h-full rounded-xl bg-color3 p-4 shadow-xl">
          <Editor/> 
          <Buttons/>
        </div>
        {/* Error Output */}
        <div className="bg-color3 w-full h-full rounded-xl shadow-xl p-4 space-y-2">
          <h1 className="font-bold text-xl">
            Error Output
          </h1>
          <textarea id="errorOutput" className="resize-none w-full h-full text-red-500 rounded-lg p-2 text-red bg-color1 font-bold"></textarea>
        </div>
      </div>
      <RegisterView/>
    </div>
  )
}
