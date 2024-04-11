import fs from 'fs';
import { BooleanData, DataType, IntData, NativeFunction, RuntimeData, String, StringData, VoidData } from "./data";

export function create_global_env() {
        const environment = new RuntimeEnv();

        environment.declare('print', true, NativeFunction((args, env) => {
                console.log(...args);
                return VoidData();
        }))

        environment.declare('true', true, BooleanData(true));
        environment.declare('false', true, BooleanData(false));
        
        environment.declare('printf', true, printf);
        environment.declare('input', true, input);

        return environment;
}

export const input: NativeFunction = NativeFunction((args, env) => {
        if(args[0]) process.stdout.write((<String> args[0]).value);

        const buffer = Buffer.alloc(1024);
        const size = fs.readSync(process.stdin.fd, buffer, 0, buffer.length, 0);
        
        return StringData(buffer.toString('utf-8', 0, size).trim());
})

export const printf: NativeFunction = NativeFunction((args, env) => {
        const format: String = <String> args.shift();
        if(format.type !== 'string') throw new Error(`printf: invalid type of format string.`);
        
        let index: number = 0;
        const typecheck = (data: String, type: DataType, spec: string) => {
                if(data.type !== type)
                        throw new Error(`printf: invalid type '${data.type}' of format '%${spec}'.`);
        }

        const result: string = format.value.replace(/%([c|s|d|i|f])/g, (format, spec) => {
                const data = <String> args[index ++];
                if(!data) throw new Error(`printf: format '${format}'(#${index}) is not provided.`);

                switch(spec) {
                case 'c': case 's':
                        typecheck(data, spec == 'c' ? 'char' : 'string', spec);
                        return data.value;

                case 'd': case 'i': case 'f':
                        typecheck(data, spec == 'f' ? 'float' : 'int', spec);
                        return data.value ;

                default: throw new Error(`printf: unknown format '${format}'.`)
                }
        });

        if(args.length !== index)
                throw new Error(`printf: function requires ${index} arguments, but got ${args.length}.`);

        console.log(result);
        return IntData(result.length);
})

export class RuntimeEnv {

        private variables: Map<string, RuntimeData> = new Map();
        private constants: Set<string> = new Set();

        constructor(public readonly parent?: RuntimeEnv | undefined) { }

        public declare(symbol: string, is_constant: boolean, value: RuntimeData) {
                if(this.variables.has(symbol))
                        throw new Error(`duplicated variable name '${ symbol }'.`);
                

                this.variables.set(symbol, value);
                if(is_constant) this.constants.add(symbol);
        }

        public assign(symbol: string, value: RuntimeData) {
                const env = this.resolve(symbol);
                if(env.constants.has(symbol))
                        throw new Error(`Cannot assign to 'output' because it is a constant.`);

                env.variables.set(symbol, value);
                return value;
        }

        public reference(symbol: string) {
                return this.resolve(symbol).variables.get(symbol) as RuntimeData;
        }

        public resolve(symbol: string): RuntimeEnv {
                if(this.variables.has(symbol)) return this;

                if(!this.parent)
                        throw new Error(`cannot find name '${ symbol }'.`);
                return this.parent.resolve(symbol);
        }
}