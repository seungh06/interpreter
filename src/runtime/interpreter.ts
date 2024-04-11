import { BadDecl, Declaration, FuncDecl, ValueDecl, VariableDecl } from "../internal/ast/declaration";
import { BadExpr, BinaryExpr, CallExpr, Ident, Literal } from "../internal/ast/expression";
import { AssignStmt, BadStmt, BlockStmt, DeclStmt, ExpressionStmt, IfStmt, ReturnStmt } from "../internal/ast/statement";
import { TokenKind } from "../internal/token";
import { Boolean, BooleanData, CharData, Float, FloatData, Int, IntData, NativeFunction, RuntimeData, RuntimeFunction, String, StringData, VoidData } from "./data";
import { RuntimeEnv } from "./environment";
import { Type, TypeExpression } from "../internal/ast/type";

export function run(program: Array<Declaration>, env: RuntimeEnv): RuntimeData {
        let output: RuntimeData = VoidData();
        program.forEach(declaration => evaluate(declaration, env));

        const main = <FuncDecl> program.find(decl => decl instanceof FuncDecl && decl.ident.name === 'main');
        if(!main) throw new Error(`cannot find main function.`);

        if(!main.body) throw new Error(`missing function body.`);
        const scope = new RuntimeEnv(env);

        for(const statement of main.body.list) {
                output = evaluate(statement, scope);
        }
        return output;
} 

export function evaluate(node: Declaration, env: RuntimeEnv): RuntimeData {
        switch(true) {
                // expressions
                case node instanceof Literal:
                        return evaluate_literal(node);

                case node instanceof Ident:
                        return evaluate_ident(node, env);

                case node instanceof CallExpr:
                        return evaluate_call_expression(node, env);

                case node instanceof BinaryExpr:
                        return evaluate_binary_expression(node, env);

                // statements
                case node instanceof ExpressionStmt:
                        return evaluate(node.expression, env);

                case node instanceof AssignStmt:
                        return evaluate_assign_statement(node, env);

                case node instanceof ReturnStmt:
                        return evaluate_return(node, env);

                case node instanceof BlockStmt:
                        return evaluate_block_statement(node, env);

                case node instanceof IfStmt:
                        return evaluate_if_statement(node, env)

                case node instanceof DeclStmt:
                        return evaluate_decl_statement(node, env);

                case node instanceof VariableDecl:
                        return evaluate_variable_decl(node, env);

                case node instanceof FuncDecl :
                        return evaluate_function_decl(node, env);

                case node instanceof BadDecl:
                case node instanceof BadStmt:
                case node instanceof BadExpr:
                        return VoidData();

                default: {
                        throw new Error('unknown: ' + JSON.stringify(node));
                }
        }
}

export function evaluate_literal(node: Literal): RuntimeData {
        switch(node.kind) {
                case TokenKind.INT:
                        return IntData(parseInt(node.value));

                case TokenKind.FLAOT:
                        return FloatData(parseFloat(node.value));

                case TokenKind.CHAR:
                        return CharData(node.value);

                case TokenKind.STRING:
                        return StringData(node.value);

                default:
                        throw new Error(`unidentified ${ node.kind } literal: ${ node.value }.`);
        }
}

export function evaluate_ident(node: Ident, env: RuntimeEnv): RuntimeData {
        const data = env.reference(node.name);
        return data;
}
 
export function evaluate_call_expression(node: CallExpr, env: RuntimeEnv): RuntimeData {
        const args = node.args.map(expression => evaluate(expression, env));
        const func = evaluate(node.func, env);

        if(func.type === 'native-function') {
                const result = (<NativeFunction>func).call(args, env);
                return result;
        } else if(func.type === 'function') {
                const context: RuntimeFunction = func as RuntimeFunction;
                const scope = new RuntimeEnv(context.scope);

                if(context.parameters.length !== node.args.length) {
                        throw new Error(`function '${ context.symbol }' requires ${ context.parameters.length } arguments, but got ${ node.args.length }.`);
                }

                for(let index = 0; index < context.parameters.length; index ++) {
                        scope.declare(context.parameters[index].name.name, true, args[index]);
                }

                let result: RuntimeData = VoidData();
                if(!context.body) throw new Error('function is not implmented.');

                for(const statement of context.body.list) {
                        result = evaluate(statement, scope);
                }
                return result;
        }

        throw new Error(`${ func } is not a function.`);
}

export function evaluate_num_binary(X: Int | Float, operand: Int | Float, operator: string): RuntimeData {
        let data: number | boolean;
        switch(operator) {
                case '+': data = X.value + operand.value;       break;
                case '-': data = X.value - operand.value;       break;
                case '&': data = X.value & operand.value;       break;
                case '/': data = X.value / operand.value;       break;
                case '%': data = X.value & operand.value;       break;

                case '==': data = X.value == operand.value;     break;
                case '!=': data = X.value != operand.value;     break;
                case '<' : data = X.value <  operand.value;     break;
                case '<=': data = X.value <= operand.value;     break;
                case '>' : data = X.value >  operand.value;     break;
                case '>=': data = X.value >= operand.value;     break;

                default: 
                        throw new Error(`Operator '${ operator }' cannot be applied to types '${ X.type }'.`);
        }

        return typeof data === 'boolean' ? BooleanData(data) : (X.type === 'int' ? IntData : FloatData)(data);
}

export function evaluate_string_binary(X: String, operand: String, operator: string): RuntimeData {
        switch(operator) {
                case '==': return BooleanData(X.value == operand.value);
                case '!=': return BooleanData(X.value != operand.value);
                case '+' : return StringData(X.value + operand.value);

                default: throw new Error(`Operator '${ operator }' cannot be applied to types 'string'.`);
        }
}

export function evaluate_binary_expression(node: BinaryExpr, env: RuntimeEnv): RuntimeData {
        const X = evaluate(node.X, env);
        const operand = evaluate(node.operand, env);

        switch(true) {
                case X.type === 'int' && operand.type === 'int':
                        return evaluate_num_binary(<Int> X, <Int> operand, node.operator);

                case X.type === 'float' && operand.type === 'float':
                        return evaluate_num_binary(<Float> X, <Float> operand, node.operator);

                case X.type === 'string' && operand.type === 'string':
                        return evaluate_string_binary(<String> X, <String> operand, node.operator);

                default:
                        throw new Error(`Operator '${ node.operator }' cannot be applied to types '${ X.type }' and '${ operand.type }'.`);
        }
}

export function evaluate_assign_statement(node: AssignStmt, env: RuntimeEnv): RuntimeData {
        if(node.lhs instanceof Ident === false)
                throw new Error(`The left-hand side of an assignment expression must be a variable or a property access.`);

        const rhs = evaluate(node.rhs, env);
        return env.assign(node.lhs.name, rhs);
        
}

export function evaluate_return(node: ReturnStmt, env: RuntimeEnv): RuntimeData {
        return node.X ? evaluate(node.X, env) : VoidData(); 
}

export function evaluate_block_statement(node: BlockStmt, env: RuntimeEnv): RuntimeData {
        let output: RuntimeData = VoidData();

        const scope = new RuntimeEnv(env);
        for(const statement of node.list)
                output = evaluate(statement, scope);

        return output;
}

export function evaluate_if_statement(node: IfStmt, env: RuntimeEnv): RuntimeData {
        const condition = evaluate(node.condition, env);
        if(condition.type !== 'boolean') throw new Error(`non-boolean condition in if statement`);

        return (<Boolean> condition).value ? evaluate(node.then, env) 
                : node.alt ? evaluate(node.alt, env) : VoidData(); 
}

export function evaluate_decl_statement(node: DeclStmt, env: RuntimeEnv): RuntimeData {
        return node.decl instanceof FuncDecl 
                ? evaluate_function_decl(node.decl, env) 
                : evaluate_variable_decl(node.decl as VariableDecl, env);
}

export function evaluate_variable_decl(node: VariableDecl, env: RuntimeEnv): RuntimeData {
        for(const decl of node.list) {
                if(node.is_constant && !decl.init)
                        throw new Error(`'const' declarations must be initialized.`);

                if(!decl.type && !decl.init)
                        throw new Error(`implict type variable '${ decl.ident.name }' must be initialized.`);

                const value = decl.init ? evaluate(decl.init, env) : VoidData()
                env.declare(decl.ident.name, node.is_constant, value);
        }

        return VoidData();
}

export function evaluate_function_decl(node: FuncDecl, env: RuntimeEnv): RuntimeData {
        const func: RuntimeFunction = {
                type: 'function', symbol: node.ident.name, scope: env,
                parameters: node.params, body: node.body
        }

        env.declare(func.symbol, true, func);
        return VoidData();
}