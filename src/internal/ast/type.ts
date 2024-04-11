import { Expression, Ident } from "./expression";

export abstract class Type {
    constructor(public readonly start: number, public readonly end: number) {};
}

export class BadType extends Type {
        constructor(
                public readonly start: number, public readonly end: number
        ) { super(start, end) }
}

export class TypeExpression extends Type {
        constructor(
                public readonly start: number, public readonly end: number,
                public readonly type : Expression
        ) { super(start, end) }
}

export class ArrayType extends Type {
        constructor(
                public readonly start  : number, public readonly end : number,
                public readonly element: Type  , public readonly size: Expression | undefined
        ) { super(start, end) }
}