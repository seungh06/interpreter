import { Expression, Field } from "../internal/ast/expression";
import { BlockStmt } from "../internal/ast/statement";
import { RuntimeEnv } from "./environment";

export type DataType = 
        'int' | 'float' | 'boolean' | 'char' | 'string' | 'void' | 
        'function' | 'native-function'; 

export interface RuntimeData {
        type: DataType
}

export const RuntimeData = (type: DataType, data: any): RuntimeData => {
        switch(type) {
        case 'int'    : return IntData(data);
        case 'float'  : return FloatData(data);
        case 'char'   : return CharData(data);
        case 'string' : return StringData(data);
        case 'boolean': return BooleanData(data);
        default: return VoidData();
        }
} 



export interface Void extends RuntimeData {
        type: 'void', value: 'void'
}

export const VoidData = () => ({ type: 'void', value: 'void' } as Void);


export interface Int extends RuntimeData {
        type: 'int', value: number
}
export const IntData = (value: number = 0) => ({ type: 'int', value } as Int);



export interface Float extends RuntimeData {
        type: 'float', value: number
}
export const FloatData = (value: number = 0.0) => ({ type: 'float', value } as Float);



export interface Char extends RuntimeData {
        type: 'char', value: string
}
export const CharData = (value: string = '') => ({ type: 'char', value } as Char);



export interface String extends RuntimeData {
        type: 'string', value: string
}
export const StringData = (value: string = '') => ({ type: 'string', value } as String);



export interface Boolean extends RuntimeData {
        type: 'boolean', value: boolean
}
export const BooleanData = (value: boolean = false) => ({ type: 'boolean', value } as Boolean);





export type FunctionCall = (args: RuntimeData[], env: RuntimeEnv) => RuntimeData;

export interface NativeFunction extends RuntimeData {
        type: 'native-function', call: FunctionCall
}
export const NativeFunction = (call: FunctionCall) => ({ type: 'native-function', call } as NativeFunction);

export interface RuntimeFunction extends RuntimeData {
        type: 'function', symbol: string, scope: RuntimeEnv,
        parameters: Array<Field>, body: BlockStmt | undefined
}