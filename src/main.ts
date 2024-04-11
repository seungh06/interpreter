import { readFileSync } from "fs";
import { inspect } from "util";
import { parse } from "./internal/parser";
import { run } from "./runtime/interpreter";
import { create_global_env } from "./runtime/environment";

const path = 'C:/Users/seungh/Desktop/interpreter/test.go';
const program = parse(path, readFileSync(path).toString());

console.log(inspect(program, false, null, true));


const output = run(program.program, create_global_env());
//console.log(output);