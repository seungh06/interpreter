export interface Token {
        kind: TokenKind, pos: TokenPos, src: string
}

export interface TokenPos {
        start: number, end: number, line: number, column: number
}

export enum TokenKind {
        /*                                       ADJUSTMENTS                                       */
        ILLEGAL = 'ILLEGAL', EOF = 'EOF', COMMENT = 'COMMENT', IDENT = 'IDENT',

        /*                                        LITERALS                                         */
        INT = 'INT', FLAOT = 'FLOAT', CHAR = 'CHAR', STRING = 'STRING',


        /*                                        OPERATORS                                        */
        ADD        = '+' , SUB        = '-' , MUL        = '*' , DIV        = '/' , REM        = '%' ,
        ADD_ASSIGN = '+=', SUB_ASSIGN = '-=', MUL_ASSIGN = '*=', DIV_ASSIGN = '/=', REM_ASSIGN = '%=',

        AND        = '&' , OR        = '|' , XOR        = '^' , SHL        = '<<' , SHR        = '>>' ,
        AND_ASSIGN = '&=', OR_ASSIGN = '|=', XOR_ASSIGN = '^=', SHL_ASSIGN = '<<=', SHR_ASSIGN = '>>=',

        LPAREN = '(', LBRACK = '[', LBRACE = '{', RPAREN = ')', RBRACK = ']', RBRACE = '}',

        LAND = '&&', LOR = '||', INC = '++', DEC = '--',

        ASSIGN = '=' , NOT = '!' ,
        EQL    = '==', NEQ = '!=', LT = '<' , LEQ = '<=', GT = '>', GEQ = '>=',

        ARROW = '->', ELLIPSIS = '...', TILDE     = '~',
        COMMA = ',' , PERIOD   = '.'  , SEMICOLON = ';', COLON = ':', 


        
        /*                                            KEYWORDS                                            */
        BREAK  = 'break' , CASE   = 'case'  , CONST  = 'const' , CONTINUE = 'continue', DEFAULT = 'default',
        ELSE   = 'else'  , FOR    = 'for'   , FUNC   = 'func'  , IF       = 'if'      , IMPORT  = 'import' ,
        RETURN = 'return', STRUCT = 'struct', SWITCH = 'switch', TYPE     = 'type'    , VAR     = 'var'    ,
}

export const kinds: Array<string> = Object.keys(TokenKind).map(kind => kind.toLowerCase());
export const ToKind = (name: string) => TokenKind[ name.toUpperCase() as keyof typeof TokenKind ];

export const IsReserved = (name: string) =>
        kinds.indexOf(name) >= kinds.indexOf('break') && kinds.indexOf(name) <= kinds.indexOf('var');

export const precedence = (kind: TokenKind) => {
        switch(kind) {
        case TokenKind.LOR: return 1;           case TokenKind.LAND: return 2;
	case TokenKind.EQL: case TokenKind.NEQ: case TokenKind.LT: case TokenKind.LEQ: case TokenKind.GT: case TokenKind.GEQ:
		return 3
	case TokenKind.ADD: case TokenKind.SUB: case TokenKind.OR: case TokenKind.XOR:
		return 4
	case TokenKind.MUL: case TokenKind.DIV: case TokenKind.REM: case TokenKind.SHL: case TokenKind.SHR: case TokenKind.AND:
                return 5

        default: return 0;
        }
}