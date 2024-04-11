import { TokenKind, TokenPos } from "../token"

export type Field = { name: Ident, type: Expression };

export abstract class Expression {
        constructor(public readonly start: number, public readonly end: number) { }
}

export class BadExpr extends Expression {
        constructor(
                public readonly start: number, public readonly end: number
        ) { super(start, end) }
}

export class UnaryExpr extends Expression {
        constructor(
                public readonly start   : number   , public readonly end: number,
                public readonly operator: TokenKind, public readonly X  : Expression
        ) { super(start, end) }
}

export class StarExpr extends Expression {
        constructor(
                public readonly start: number    , public readonly end: number,
                public readonly X    : Expression,
        ) { super(start, end) }
}

export class BinaryExpr extends Expression {
        constructor(
                public readonly start: number    , public readonly end     : number   ,
                public readonly X    : Expression, public readonly operator: TokenKind, public readonly operand: Expression 
        ) { super(start, end) }
}

export class Ident extends Expression {
        constructor(
                public readonly start: number, public readonly end: number,
                public readonly name : string
        ) { super(start, end) }
}

export class Literal extends Expression {
        constructor(
                public readonly start: number   , public readonly end  : number,
                public readonly kind : TokenKind, public readonly value: string
        ) { super(start, end) }
}

export class SelectorExpr extends Expression {
        constructor(
                public readonly start: number    , public readonly end     : number,
                public readonly X    : Expression, public readonly selector: Ident
        ) { super(start, end) }
}

export class CallExpr extends Expression {
        constructor(
                public readonly start: number    , public readonly end : number,
                public readonly func : Expression, public readonly args: Array<Expression>, public readonly ellipsis: TokenPos | undefined
        ) { super(start, end) }
}

export class Ellipsis extends Expression {
        constructor(
                public readonly start: number, public readonly end: number,
        ) { super(start, end) }
}