import { Token, TokenKind, TokenPos, precedence } from "./token";
import { scan } from "./scanner";
import { BadDecl, Declaration, FuncDecl, TypeDecl, ValueDecl, VariableDecl } from "./ast/declaration";
import { BadExpr, BinaryExpr, CallExpr, Ellipsis, Expression, Field, Ident, Literal, SelectorExpr, StarExpr, UnaryExpr } from "./ast/expression";
import { AssignStmt, BadStmt, BlockStmt, BranchStmt, DeclStmt, EmptyStmt, ExpressionStmt, IfStmt, IncDecStmt, ReturnStmt, Statement } from "./ast/statement";
import { ArrayType, BadType, Type, TypeExpression } from "./ast/type";

export interface parser {
        
        // initial immutable variables
        path  : string          // path of compile target
        tokens: Array<Token>    // scanned token array

        // global state & variables
        token: Token,           // current token
        index: number           // current token index

        rhs  : boolean          // parsing rhs

        // errors & warinings
        errors: Array<report>, warnings: Array<report>
}

export type report = { pos: TokenPos, message: string };

export function init(path: string, src: string) {
        const parser = { /* parser instance */ } as parser;
        const handler = (pos: TokenPos, message: string) => parser.errors.push({ pos, message });

        parser.errors = [], parser.warnings = [];
        parser.path = path, parser.tokens = scan(path, src, handler);

        parser.index = 0, parser.token = parser.tokens[ parser.index ];
        parser.rhs = false;

        return parser;
}

export const isEOF = (parser: parser) => parser.token.kind === TokenKind.EOF;

export function reference(parser: parser, offset: number = 0) {
        return parser.tokens[ parser.index + offset ];
}

export const match = (parser: parser, kind: TokenKind) => parser.token.kind === kind;

export function consume(parser: parser): Token {
        parser.token = parser.tokens[ isEOF(parser) ? parser.index : ++ parser.index ];
        return reference(parser, -1);
}

export function expect(parser: parser, kind: TokenKind, message?: string): Token {
        if(parser.token.kind !== kind) error_expected(parser, message || `'${ kind }'`);
        return consume(parser);
}

export function error_expected(parser: parser, message: string) {
        switch(true) {
        case parser.token.kind === TokenKind.SEMICOLON && parser.token.src === '\n':
                message = `unexpected newline, expected ${ message }.`;
                break;

        case parser.token.kind === TokenKind.EOF:
                message = `unexpected 'EOF', expected ${ message }.`
                break;

        default:
                message = `unexpected '${ parser.token.src }', expected ${ message }.`;
        }
        
        return error(parser, message);
}

export function error(parser: parser, message: string) {
        parser.errors.push({ pos: parser.token.pos, message });
}

export const consume_semi = (parser: parser) => 
        parser.token.kind === TokenKind.SEMICOLON ? consume(parser) : parser.token.kind;

export function at_comma(parser: parser, descriptor: string, follow: TokenKind) {
        if(parser.token.kind === TokenKind.COMMA) return true;
        if(parser.token.kind === TokenKind.EOF || parser.token.kind === follow) return false;

        let message = `missing ','`;
        if(parser.token.kind === TokenKind.SEMICOLON && parser.token.src === '\n')
                message += ' before newline';

        error(parser, `${ message } in ${ descriptor }.`);
        return true;
}

export function got(parser: parser, kind: TokenKind) {
        if(parser.token.kind === kind) {
                consume(parser);
                return true;
        } else return false;
}

export function expect_closing(parser: parser, kind: TokenKind, descriptor: string) {
        if(
                parser.token.kind !== kind && 
                parser.token.kind === TokenKind.SEMICOLON && parser.token.src === '\n'
        ) {
                error(parser, `missing ',' before newline in ${ descriptor }.`);
		consume(parser);
        }

        return expect(parser, kind);
}

export const declaration_start: Array<TokenKind> = [
        TokenKind.IMPORT,
        TokenKind.TYPE,
        TokenKind.CONST,
        TokenKind.VAR,
        TokenKind.FUNC
]

export const statement_start: Array<TokenKind> = [
        TokenKind.BREAK,
        TokenKind.CONST,
        TokenKind.CONTINUE,
        TokenKind.FOR,
        TokenKind.IF,
        TokenKind.RETURN,
        TokenKind.SWITCH,
        TokenKind.TYPE,
        TokenKind.VAR
]

export const expression_end: Array<TokenKind> = [
        TokenKind.COMMA,
        TokenKind.COLON,
        TokenKind.SEMICOLON,
        TokenKind.RPAREN,
        TokenKind.RBRACE,
        TokenKind.RBRACK
]

export function advance(parser: parser, to: Array<TokenKind>) {
        while(!isEOF(parser) && !to.includes(parser.token.kind)) consume(parser);  
}




export function parse(path: string, src: string) {
        const parser = init(path, src);

        const statements: Array<Declaration> = [];
        while(!isEOF(parser)) statements.push(parse_declaration(parser, declaration_start));

        return { program: statements, errors: parser.errors, warnings: parser.warnings };
}



export function parse_statement_list(parser: parser) {
        const list: Array<Statement> = [];

        while(
                [ TokenKind.CASE, TokenKind.DEFAULT, TokenKind.RBRACE, TokenKind.EOF ]
                .includes(parser.token.kind) === false
        ) list.push(parse_statement(parser));

        return list;
}

export function parse_declaration(parser: parser, recover: Array<TokenKind>) {
        switch(parser.token.kind) {
                //case TokenKind.IMPORT:

                case TokenKind.CONST: case TokenKind.VAR:
                        return parse_variable_declaration(parser); 

                case TokenKind.TYPE:
                        return parse_type_declaration(parser);

                case TokenKind.FUNC:
                        return parse_func_declaration(parser);

                default:
                {
                        const start = parser.token.pos.start;
                        error_expected(parser, 'declaration'), advance(parser, recover);
                        return new BadDecl(start, parser.token.pos.start);
                        //return parse_statement(parser);
                }
        }
}

export function parse_variable_declaration(parser: parser) {
        const { pos, kind } = expect(parser, parser.token.kind);
        const is_constant = kind === TokenKind.CONST;

        const list: Array<ValueDecl> = [];
        do {
                const ident = parse_ident(parser);

                let type: Expression | undefined;
                if(got(parser, TokenKind.COLON)) type = parse_type(parser); 

                let init: Expression | undefined;
                if(got(parser, TokenKind.ASSIGN)) init = parse_rhs(parser); 

                list.push(new ValueDecl(ident.start, parser.token.pos.end, ident, type, init));
        } while(got(parser, TokenKind.COMMA));

        consume_semi(parser);
        return new VariableDecl(pos.start, parser.token.pos.start, is_constant, list);
}

export function parse_type_declaration(parser: parser) {
        const open = expect(parser, TokenKind.TYPE).pos.start;

        const ident = parse_ident(parser);
        if(!got(parser, TokenKind.ASSIGN)) error_expected(parser, '=');

        const type: Expression = parse_type(parser);
        consume_semi(parser);
        return new TypeDecl(open, parser.token.pos.start, ident, type);
}

export function parse_func_declaration(parser: parser) {
        const open = expect(parser, TokenKind.FUNC).pos.start;

        const ident = parse_ident(parser);
        const params = parse_parameter_list(parser);

        let type: Expression | undefined;
        if(parser.token.kind === TokenKind.COLON) {
                consume(parser), type = parse_type(parser);
        }

        let body: BlockStmt | undefined;
        switch(parser.token.kind) {
                case TokenKind.LBRACE:
                        body = parse_block_statement(parser);
                        break;

                case TokenKind.SEMICOLON:
                        consume(parser);
                        if(match(parser, TokenKind.LBRACE)) {
                                error(parser, 'unexpected semicolon or newline before {');
                                body = parse_block_statement(parser);
                        }
                        break;

                default:
                        consume_semi(parser);
        }

        return new FuncDecl(open, parser.token.pos.start, ident, params, type, body);
}

export function parse_parameter_list(parser: parser) {
        expect(parser, TokenKind.LPAREN);

        const fields: Array<Field> = [];
        if(parser.token.kind !== TokenKind.RPAREN) {
                while(!match(parser, TokenKind.RPAREN) && !isEOF(parser)) {
                        
                        const field = parse_parameter(parser);
                        if(field) fields.push(field);

                        if(!at_comma(parser, 'parameter list', TokenKind.RPAREN)) break;
                        if(parser.token.kind !== TokenKind.IDENT) consume(parser);
                }
        }

        expect(parser, TokenKind.RPAREN);
        return fields;
}

export function parse_parameter(parser: parser) {
        switch(parser.token.kind) {
                case TokenKind.IDENT: {
                        const ident = parse_ident(parser);
                        
                        let type: Expression | undefined;
                        if(match(parser, TokenKind.COLON)) {
                                consume(parser), type = parse_type(parser);
                        } else {
                                const start = parser.token.pos.start;
                                error_expected(parser, `':'`), advance(parser, expression_end);

                                type = new BadExpr(start, parser.token.pos.start);
                        }

                        return { name: ident, type };
                }

                default:
                        error_expected(parser, `')'`), advance(parser, expression_end);
        }
}

export function parse_type(parser: parser) {
        switch(parser.token.kind) {
                case TokenKind.IDENT: {
                        const expression = parse_type_expression(parser);
                        const type = new TypeExpression(expression.start, expression.end, expression);

                        if(got(parser, TokenKind.LBRACK)) return parse_array_type(parser, expression);
                        return type;
                }

                default: {
                        const start = parser.token.pos.start;
                        error_expected(parser, 'type'), advance(parser, expression_end);
                        return new BadType(start,parser.token.pos.start);
                }
        }
}

export function parse_type_expression(parser: parser) {
        const ident = parse_ident(parser);

        if(got(parser, TokenKind.PERIOD)) {
                const selector = parse_ident(parser);
                return new SelectorExpr(ident.start, selector.end, ident, selector);
        }

        return ident;
}

export function parse_array_type(parser: parser, element: Type, size?: Expression) {
        if(!size) {
                if(parser.token.kind === TokenKind.ELLIPSIS) {
                        size = new Ellipsis(parser.token.pos.start, parser.token.pos.end);
                        consume(parser);
                } else if(parser.token.kind !== TokenKind.RBRACK) {
                        size = parse_rhs(parser);
                }
        }

        const close = expect(parser, TokenKind.RBRACK).pos.end;
        return new ArrayType(element.start, close, element, size);
}


export function parse_statement(parser: parser) {
        let statement: Statement;
        switch(parser.token.kind) {
                case TokenKind.FUNC: case TokenKind.CONST: case TokenKind.VAR: case TokenKind.TYPE:
                {
                        const decl = parse_declaration(parser, statement_start);
                        statement = new DeclStmt(decl.start, decl.end, decl);
                        break;
                }

                case TokenKind.IDENT: case TokenKind.INT: case TokenKind.FLAOT: case TokenKind.CHAR: case TokenKind.STRING: case TokenKind.LPAREN:
                case TokenKind.STRUCT: case TokenKind.ADD: case TokenKind.SUB: case TokenKind.MUL: case TokenKind.AND:  case TokenKind.XOR:  case TokenKind.NOT:
                        statement = parse_simple_statement(parser);
                        consume_semi(parser);
                        break;

                case TokenKind.RETURN:
                        statement = parse_return_statement(parser);
                        break;

                case TokenKind.BREAK: case TokenKind.CONTINUE:
                        statement = parse_branch_statement(parser);
                        break;

                case TokenKind.LBRACE:
                        statement = parse_block_statement(parser);
                        break;

                case TokenKind.IF:
                        statement = parse_if_statement(parser);
                        break;

                case TokenKind.SEMICOLON:
                {
                        const semi = consume(parser);
                        statement = new EmptyStmt(semi.pos.start, semi.pos.start, semi.src === '\n');
                        break;
                }

                case TokenKind.RBRACE:
                        statement = new EmptyStmt(parser.token.pos.start, parser.token.pos.end, true);
                        break;


                default: {
                        const start = parser.token.pos.start;
                        error_expected(parser, 'statement'), advance(parser, statement_start);

                        statement = new BadStmt(start, parser.token.pos.start);
                }
        }

        return statement;
}

export function parse_simple_statement(parser: parser) {
        const expression = parse_expression(parser);

        switch(parser.token.kind) {
                case TokenKind.ASSIGN: 
                case TokenKind.ADD_ASSIGN: case TokenKind.SUB_ASSIGN: case TokenKind.MUL_ASSIGN: case TokenKind.DIV_ASSIGN:
                case TokenKind.REM_ASSIGN: case TokenKind.AND_ASSIGN: case TokenKind.OR_ASSIGN : case TokenKind.XOR_ASSIGN:
                case TokenKind.SHL_ASSIGN: case TokenKind.SHR_ASSIGN:
                {       
                        const assign = consume(parser).kind;
                        const rhs = parse_expression(parser);
                        return new AssignStmt(expression.start, rhs.end, expression, assign, rhs);
                }

                case TokenKind.INC: case TokenKind.DEC:
                {
                        const operator = consume(parser);
                        return new IncDecStmt(expression.start, operator.pos.end, expression, operator.kind);
                }
        }

        return new ExpressionStmt(expression.start, expression.end, expression);
}

export function parse_return_statement(parser: parser) {
        const opening = expect(parser, TokenKind.RETURN).pos.start;

        const expression = parser.token.kind !== TokenKind.SEMICOLON && parser.token.kind !== TokenKind.RBRACE
                ? parse_expression(parser) : undefined;

        consume_semi(parser);
        return new ReturnStmt(opening, parser.token.pos.start, expression);
}

export function parse_branch_statement(parser: parser) {
        const keyword = expect(parser, parser.token.kind);
        consume_semi(parser);

        return new BranchStmt(keyword.pos.start, keyword.pos.end, keyword.kind);
}

export function parse_block_statement(parser: parser) {
        const opening = expect(parser, TokenKind.LBRACE).pos.start;

        const list = parse_statement_list(parser);
        
        const closing = expect(parser, TokenKind.RBRACE).pos.end;
        consume_semi(parser);

        return new BlockStmt(opening, closing, list);
}

export function parse_if_statement(parser: parser): Statement {
        const open = expect(parser, TokenKind.IF).pos.start;

        const condition = parse_if_header(parser);
        const then = parse_block_statement(parser);
        
        let alt: Statement | undefined;
        if(got(parser, TokenKind.ELSE)) {
                switch(parser.token.kind) {
                case TokenKind.IF:
                        alt = parse_if_statement(parser);
                        break;

                case TokenKind.LBRACE:
                        alt = parse_block_statement(parser);
                        break;

                default:
                        error_expected(parser, `if statement or block`);
                        alt = new BadStmt(parser.token.pos.start, parser.token.pos.end);
                }
        }
        return new IfStmt(open, parser.token.pos.start, condition, then, alt);
}

export function parse_if_header(parser: parser) {
        if(parser.token.kind === TokenKind.LBRACE) {
                error(parser, `missing condition in if statement.`);
                return new BadExpr(parser.token.pos.start, parser.token.pos.end);
        }

        const condition = parse_expression(parser);
        consume_semi(parser);

        return condition;
}

export function parse_expression(parser: parser) {
        return parse_binary_expression(parser);
}

export function parse_rhs(parser: parser) {
        const rhs = parser.rhs;
        parser.rhs = true;

        const expression = parse_expression(parser);
        parser.rhs = rhs;

        return expression;
}

export function parse_binary_expression(parser: parser, _precedence: number = 1): Expression {
        let expression = parse_unary_expression(parser);
        while(true) {
                const prec = precedence(
                        parser.rhs && parser.token.kind === TokenKind.ASSIGN
                                ? TokenKind.EQL : parser.token.kind
                );
                if(prec < _precedence) return expression;

                const operator = consume(parser).kind; 
                const operand = parse_binary_expression(parser, prec + 1);

                expression = new BinaryExpr(expression.start, operand.end, expression, operator, operand);
        }
}

export function parse_unary_expression(parser: parser): Expression {
        switch(parser.token.kind) {
                case TokenKind.ADD: case TokenKind.SUB: case TokenKind.NOT:
                case TokenKind.XOR: case TokenKind.AND: case TokenKind.TILDE:
                {
                        const { pos, kind } = consume(parser);
                        const expresison = parse_unary_expression(parser);

                        return new UnaryExpr(pos.start, expresison.end, kind, expresison);
                }

                case TokenKind.MUL:
                {
                        const { pos } = consume(parser);
                        const expression = parse_unary_expression(parser);

                        return new StarExpr(pos.start, expression.end, expression);
                }
        }

        return parse_primary_expression(parser);
}

export function parse_primary_expression(parser: parser) {
        let expression = parse_operand(parser);
        while(true) {
                switch(parser.token.kind) {

                case TokenKind.PERIOD:
                {
                        consume(parser);
                        if(match(parser, TokenKind.IDENT)) expression = parse_selector(parser, expression);
                        else {
                                const pos = parser.token.pos;
                                error_expected(parser, 'selector'), consume(parser);
        
                                const selector = new Ident(pos.start, pos.end, '_');
                                expression = new SelectorExpr(expression.start, selector.end, expression, selector);
                        }
                        break;
                }

                // case TokenKind.LBRACK:
                case TokenKind.LPAREN:
                        expression = parse_call_expression(parser, expression);
                        break;
                // case TokenKind.LBRACE
        
                default:
                        return expression;
                }
        }
}

export function parse_operand(parser: parser): Expression {
        switch(parser.token.kind) {
                case TokenKind.IDENT:
                        return parse_ident(parser);

                case TokenKind.INT: case TokenKind.FLAOT: case TokenKind.CHAR: case TokenKind.STRING:
                {
                        const { kind, src, pos } = consume(parser);
                        return new Literal(pos.start, pos.end, kind, src);
                }

                case TokenKind.LPAREN:
                        consume(parser);
                        const expression = parse_expression(parser);

                        expect(parser, TokenKind.RPAREN), consume_semi(parser);
                        return expression;

                default: {
                        const start = parser.token.pos.start;
                        error_expected(parser, 'operand'), advance(parser, [ ...expression_end, ...declaration_start, ...statement_start ]);
                        return new BadExpr(start, parser.token.pos.start);
                }
        }
}

export function parse_ident(parser: parser): Ident {
        const symbol = expect(parser, TokenKind.IDENT, 'name');
        return new Ident(symbol.pos.start, symbol.pos.end, symbol.src);
}

export function parse_selector(parser: parser, x: Expression) {
        const selector = parse_ident(parser);
        return new SelectorExpr(x.start, selector.end, x, selector);
}

export function parse_call_expression(parser: parser, func: Expression) {
        const open = expect(parser, TokenKind.LPAREN).pos.start;

        const list: Array<Expression> = [];
        let ellipsis: TokenPos | undefined

        while(parser.token.kind !== TokenKind.RPAREN && !isEOF(parser)) {
                if(parser.token.kind === TokenKind.ELLIPSIS) ellipsis = consume(parser).pos;
                list.push(parse_rhs(parser)); 

                if(!at_comma(parser, 'arugment list', TokenKind.RPAREN)) break;
                got(parser, TokenKind.COMMA);
        }

        const close = expect_closing(parser, TokenKind.RPAREN, 'argument list').pos.end;
        return new CallExpr(open, close, func, list, ellipsis)
}