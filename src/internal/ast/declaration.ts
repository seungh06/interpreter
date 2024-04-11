import { Expression, Field, Ident } from "./expression"
import { BlockStmt } from "./statement"
import { Type } from "./type"

export abstract class Declaration {
        constructor(public readonly start: number, public readonly end: number) {};
}

export class BadDecl extends Declaration {
        constructor(
                public readonly start: number, public readonly end: number
        ) { super(start, end) }
} 

export class FuncDecl extends Declaration {
        constructor(
                public readonly start: number, public readonly end   : number,
                public readonly ident: Ident , public readonly params: Array<Field>, public readonly type: Type | undefined, public readonly body: BlockStmt | undefined
        ) { super(start, end) }
}

export class TypeDecl extends Declaration {
        constructor(
                public readonly start: number, public readonly end : number,
                public readonly ident: Ident , public readonly type: Type
        ) { super(start, end) }
}


export class VariableDecl extends Declaration {
        constructor(
                public readonly start      : number , public readonly end : number,
                public readonly is_constant: boolean, public readonly list: Array<ValueDecl>
        ) { super(start, end) }
}

export class ValueDecl extends Declaration {
        constructor(
                public readonly start: number, public readonly end : number,
                public readonly ident: Ident , public readonly type: Type | undefined, public readonly init: Expression | undefined
        ) { super(start, end) }
}