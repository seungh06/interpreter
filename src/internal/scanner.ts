import { Token, TokenKind, TokenPos, IsReserved, ToKind } from "./token";

export interface scanner {

        // initial immutable variables
        path   : string         // path of compile target
        src    : string         // source code string
        size   : number         // size of source code string
        handler: ErrorHandler   // error handler function

        // global states & variables
        pos       : TokenPos    // current pos position interface
        insertSemi: boolean     // insert semicolon before next '\n'

        // scanner outputs
        errorCount: number              // number of errors occurred
        tokens    : Array<Token>        // scanned token array   
        
}

export type ErrorHandler = (pos: TokenPos, message: string) => void;

export function init(path: string, src: string, handler: ErrorHandler) {
        const scanner = { /* scanner instace */ } as scanner;

        scanner.path = path, scanner.src = src, scanner.size = src.length;
        scanner.handler = handler;

        scanner.pos = { start: 0, end: 0, line: 1, column: 1 };
        scanner.insertSemi = false;

        scanner.errorCount = 0, scanner.tokens = [];

        return scanner;
}

export const isEOF = (scanner: scanner, offset: number = 0) => 
        scanner.pos.end + offset >= scanner.size;

export const reference = (scanner: scanner, offset: number = 0) =>
        isEOF(scanner, offset) ? '\0' : scanner.src.charAt(scanner.pos.end + offset);

export function next(scanner: scanner, skip: boolean = false) {
        if(skip) scanner.pos.start ++;  // increase start position to skip character
        if(reference(scanner) === '\n') {
                scanner.pos.line ++, scanner.pos.column = 1;
        }

        scanner.pos.end ++, scanner.pos.column ++;
}

export function expect(scanner: scanner, character: string) {
        const res = !isEOF(scanner) 
                && reference(scanner).toLowerCase() === character.toLowerCase();
        if(res) next(scanner);
        
        return res;
}

export function error(scanner: scanner, message: string) {
        scanner.errorCount ++, scanner.handler(scanner.pos, message);
}

export function declare_token(scanner: scanner, kind: TokenKind, raw?: string) {
        const src = raw ?? scanner.src.substring(scanner.pos.start, scanner.pos.end);
        scanner.tokens.push({ kind, src, pos: {...scanner.pos} });
}



export const branch_switch = (scanner: scanner, single: TokenKind, assign: TokenKind) => 
        expect(scanner, '=') ? assign : single;

export const branch_switch_ex = (scanner: scanner, single: TokenKind, assign: TokenKind, character: string, extend: TokenKind) =>
        branch_switch(scanner, expect(scanner, character) ? extend : single, assign);

export const branch_switch_ex_assign = (scanner: scanner, single: TokenKind, assign: TokenKind, character: string, extend: TokenKind, extend_assign: TokenKind) =>
        branch_switch(scanner, expect(scanner, character) ? branch_switch(scanner, extend, extend_assign) : single, assign)

export const is_digit = (character: string) => character >= '0' && character <= '9';
export const is_letter = (character: string) =>
        'a' <= character.toLowerCase() && 'z' >= character.toLowerCase() || character === '_' || character.charCodeAt(0) > 255; 
        
export const is_string = (character: string) => is_letter(character) || is_digit(character);



export function scan(target: string, src: string, handler: ErrorHandler) {
        const scanner = init(target, src, handler);

        for(; scanner.pos.start < scanner.size; scanner.pos.start ++) {
                scanner.pos.start = scanner.pos.end;
                process_token(scanner);
        }

        declare_token(scanner, TokenKind.EOF, '\0');
        return scanner.tokens;
}

export function process_token(scanner: scanner) {
        process_whitespace(scanner), scanner.insertSemi = false;

        const character = reference(scanner);
        scanner.pos.end ++, scanner.pos.column ++;

        switch(character) {
                case '\n':
                        scanner.insertSemi = false;
                        declare_token(scanner, TokenKind.SEMICOLON, '\n');

                        scanner.pos.line ++, scanner.pos.column = 1;
                        break;

                case '\0':
                        declare_token(scanner, scanner.insertSemi ? TokenKind.SEMICOLON : TokenKind.EOF);
                        break;

                case '(': declare_token(scanner, TokenKind.LPAREN);     break;      
                case '{': declare_token(scanner, TokenKind.LBRACE);     break;       
                case '[': declare_token(scanner, TokenKind.LBRACK);     break;

                case ')': scanner.insertSemi = true, declare_token(scanner, TokenKind.RPAREN);  break;
                case '}': scanner.insertSemi = true, declare_token(scanner, TokenKind.RBRACE);  break;
                case ']': scanner.insertSemi = true, declare_token(scanner, TokenKind.RBRACK);  break;

                case ',': declare_token(scanner, TokenKind.COMMA);      break;          
                case ':': declare_token(scanner, TokenKind.COLON);      break;          
                case ';': declare_token(scanner, TokenKind.SEMICOLON);  break;
                case '~': declare_token(scanner, TokenKind.TILDE);      break;

                case '.': 
                {
                        const is_ellipsis = reference(scanner) === '.' && reference(scanner, 1) === '.';
                        if(is_ellipsis) scanner.pos.end += 2, scanner.pos.column += 2;

                        declare_token(scanner, is_ellipsis ? TokenKind.ELLIPSIS : TokenKind.PERIOD);
                        break;
                }

                case '+': 
                {
                        const token = branch_switch_ex(scanner, TokenKind.ADD, TokenKind.ADD_ASSIGN, '+', TokenKind.INC);
                        if(token === TokenKind.INC) scanner.insertSemi = true;

                        declare_token(scanner, token);
                        break;
                }

                case '-': {
                        const token = expect(scanner, TokenKind.GT) ? TokenKind.ARROW
                                : branch_switch_ex(scanner, TokenKind.SUB, TokenKind.SUB_ASSIGN, '-', TokenKind.DEC);

                        if(token === TokenKind.DEC) scanner.insertSemi = true;
                        declare_token(scanner, token);
                        break;
                }

                case '<':
                        /*                                                      <             <=                  <<             <<=                  */
                        declare_token(scanner, branch_switch_ex_assign(scanner, TokenKind.LT, TokenKind.LEQ, '<', TokenKind.SHL, TokenKind.SHL_ASSIGN));
                        break;

                case '>':
                        /*                                                      >             >=                  >>             >>=                  */                                         
                        declare_token(scanner, branch_switch_ex_assign(scanner, TokenKind.GT, TokenKind.GEQ, '>', TokenKind.SHR, TokenKind.SHR_ASSIGN));
                        break;

                case '&': declare_token(scanner, branch_switch_ex(scanner, TokenKind.AND, TokenKind.AND_ASSIGN, '&', TokenKind.LAND));    break;
                case '|': declare_token(scanner, branch_switch_ex(scanner, TokenKind.OR, TokenKind.OR_ASSIGN, '|', TokenKind.LOR));       break;

                case '=': declare_token(scanner, branch_switch(scanner, TokenKind.ASSIGN, TokenKind.EQL));       break;
                case '!': declare_token(scanner, branch_switch(scanner, TokenKind.NOT, TokenKind.NEQ));          break;
                case '*': declare_token(scanner, branch_switch(scanner, TokenKind.MUL, TokenKind.MUL_ASSIGN));   break;
                case '%': declare_token(scanner, branch_switch(scanner, TokenKind.REM, TokenKind.REM_ASSIGN));   break;
                case '^': declare_token(scanner, branch_switch(scanner, TokenKind.XOR, TokenKind.XOR_ASSIGN));   break;

                case '`': scanner.insertSemi = true, process_raw_string(scanner);      break;
                case '"': scanner.insertSemi = true, process_string(scanner);          break;
                case "'": scanner.insertSemi = true, process_char(scanner);            break;

                case '/': process_comment(scanner); break;
                default: {
                        is_digit(character) ? process_number(scanner, character) : is_letter(character) ? process_ident(scanner) 
                        : error(scanner, `Unknwon character: '${ character }'.`);
                }
        }
}

export function process_whitespace(scanner: scanner) {
        let character: string = reference(scanner);
        while(
                character === '\n' && !scanner.insertSemi
                || character === ' ' || character === '\r' || character === '\t'
        ) next(scanner, true), character = reference(scanner);
}

export function process_raw_string(scanner: scanner) {
        while(!expect(scanner, '`')) {
                if(isEOF(scanner)) {
                        error(scanner, `unterminated raw string literal.`);
                        break;
                }
                next(scanner);
        }

        const data = scanner.src.substring(scanner.pos.start + 1, scanner.pos.end - 1);
        declare_token(scanner, TokenKind.STRING, data);
}

export function process_string(scanner: scanner) {
        let unterminated: boolean = false;

        while(!expect(scanner, '"')) {
                const is_EOF = isEOF(scanner);

                if(reference(scanner) === '\n' || is_EOF) {
                        if(!unterminated) {
                                error(scanner, `unterminated string literal.`);
                                unterminated = true;
                        }
                        if(is_EOF) break;
                }

                next(scanner);
        }

        const data = scanner.src.substring(scanner.pos.start + 1, scanner.pos.end - 1);
        declare_token(scanner, TokenKind.STRING, data);
}

export function process_char(scanner: scanner) {
        let unterminated: boolean = false;

        while(!expect(scanner, "'")) {
                const is_EOF = isEOF(scanner);

                if(reference(scanner) === '\n' || is_EOF) {
                        if(!unterminated) {
                                error(scanner, `unterminated char literal.`);
                                unterminated = true;
                        }
                        if(is_EOF) break;
                }

                next(scanner);
        }

        const data = scanner.src.substring(scanner.pos.start + 1, scanner.pos.end - 1);
        if(data.length > 1) error(scanner, 'Illegal character literal.');

        declare_token(scanner, TokenKind.CHAR, data);
}

export function process_comment(scanner: scanner) {
        // skip single line comment
        if(expect(scanner, '/')) {
                while(reference(scanner) !== '\n' && !isEOF(scanner)) {
                        scanner.pos.end ++, scanner.pos.column ++;
                }
        }

        // skip multi-line comments
        else if(expect(scanner, '*')) {
                while(reference(scanner) !== '*' && reference(scanner, 1) !== '/' && !isEOF(scanner)) next(scanner);
                if(isEOF(scanner)) error(scanner, `'*/' expected.`);

                scanner.pos.end += 2, scanner.pos.column += 2;
        }

        // declare 'div(/)' or 'div assign(/=)' token
        else declare_token(scanner, branch_switch(scanner, TokenKind.DIV, TokenKind.DIV_ASSIGN));
}

export function process_ident(scanner: scanner) {
        while(is_string(reference(scanner))) scanner.pos.end ++, scanner.pos.column ++;

        const data = scanner.src.substring(scanner.pos.start, scanner.pos.end);
        const reserved = IsReserved(data);

        // if data is not reserved or for specific keywords.
        scanner.insertSemi = !reserved || [ TokenKind.BREAK, TokenKind.CONTINUE, TokenKind.RETURN ].includes(ToKind(data));
        declare_token(scanner, reserved ? ToKind(data) : TokenKind.IDENT, data);
}

export function process_number(scanner: scanner, character: string) {
        scanner.insertSemi = true;

        while(is_string(reference(scanner))) scanner.pos.end ++, scanner.pos.column ++;

        if(expect(scanner, '.')) {
                while(is_digit(reference(scanner))) scanner.pos.end ++, scanner.pos.column ++;
                return declare_token(scanner, TokenKind.FLAOT)
        }
        declare_token(scanner, TokenKind.INT);
}