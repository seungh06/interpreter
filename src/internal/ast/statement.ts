import { TokenKind } from "../token"
import { Declaration } from "./declaration"
import { Expression } from "./expression"

export abstract class Statement {
        constructor(public readonly start: number, public readonly end: number) { }
}  

export class BadStmt extends Statement {
        constructor(
                public readonly start: number, public readonly end: number
        ) { super(start, end) }
}

export class EmptyStmt extends Statement {
        constructor(
                public readonly start   : number  , public readonly end: number,
                public readonly implicit: boolean
        ) { super(start, end) }
}

export class AssignStmt extends Statement {
        constructor(
                public readonly start: number    , public readonly end   : number   ,
                public readonly lhs  : Expression, public readonly assign: TokenKind, public readonly rhs: Expression
        ) { super(start, end) }
}

export class IncDecStmt extends Statement {
        constructor(
                public readonly start: number    , public readonly end     : number,
                public readonly lhs  : Expression, public readonly operator: TokenKind,
        ) { super(start, end) }
}

export class ExpressionStmt extends Statement {
        constructor(
                public readonly start     : number    , public readonly end: number ,
                public readonly expression: Expression,
        ) { super(start, end) }
}

export class ReturnStmt extends Statement {
        constructor(
                public readonly start: number, public readonly end: number,
                public readonly X    : Expression | undefined
        ) { super(start, end) }
}

export class BlockStmt extends Statement {
        constructor(
                public readonly start: number, public readonly end: number,
                public readonly list : Array<Statement>
        ) { super(start, end) }
}

export class IfStmt extends Statement {
        constructor(
                public readonly start    : number    , public readonly end : number,
                public readonly condition: Expression, public readonly then: BlockStmt, public readonly alt?: Statement | undefined
        ) { super(start, end) }
}


export class BranchStmt extends Statement {
        constructor(
                public readonly start: number   , public readonly end: number,
                public readonly kind : TokenKind,
        ) { super(start, end) }
}

export class DeclStmt extends Statement {
        constructor(
                public readonly start: number     , public readonly end: number,
                public readonly decl : Declaration
        ) { super(start, end) }
}