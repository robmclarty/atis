/**
 * python-helper: the Python program the Python producer runs (D115, D139).
 *
 * It reads Python files with `ast` alone, never importing or running them,
 * and prints as JSON what each declares at module scope, with the shape of
 * each public name (a function's signature and annotations, a class's bases
 * and public members, a constant's literal), its imports, its `__all__`, and
 * whether it carries a `__main__` guard. It ships as source inside atis's own
 * bundle (C9): the producer writes it into a directory of its own, outside the
 * reviewed tree, and runs it with `-I -S`, so neither the tree nor `site`
 * puts a module ahead of the standard library's.
 */

/* cspell:disable */

/** The helper's one source file. */
export const PYTHON_HELPER = String.raw`"""The atis Python helper: reads Python files with ast alone, never importing
or running them, and prints as JSON what each declares, imports and exports.

    python3 -I -S helper.py <root> < paths
"""

import ast
import json
import os
import sys


def lines_of(text):
    """A printed shape with every line trimmed and blank lines dropped."""
    return "\n".join(line.strip() for line in text.split("\n") if line.strip())


def public(name):
    return not name.startswith("_")


def public_member(name):
    return public(name) or (name.startswith("__") and name.endswith("__"))


def without_defaults(args):
    """A signature's arguments, each default's value written as ..., since the value is no part of a shape."""
    bare = ast.arguments(
        posonlyargs=args.posonlyargs,
        args=args.args,
        vararg=args.vararg,
        kwonlyargs=args.kwonlyargs,
        kw_defaults=[None if value is None else ast.Constant(value=Ellipsis) for value in args.kw_defaults],
        kwarg=args.kwarg,
        defaults=[ast.Constant(value=Ellipsis) for _ in args.defaults],
    )
    return bare


def signature(node):
    """A function's decorators, name, arguments and annotations, its body and docstring dropped."""
    fn = type(node)(
        name=node.name,
        args=without_defaults(node.args),
        body=[ast.Expr(value=ast.Constant(value=Ellipsis))],
        decorator_list=node.decorator_list,
        returns=node.returns,
        type_comment=None,
    )
    if hasattr(node, "type_params"):
        fn.type_params = node.type_params
    return lines_of(ast.unparse(ast.fix_missing_locations(fn)))


def class_shape(node):
    """A class's decorators and bases, and the signature or annotation of each public member."""
    lines = ["@" + ast.unparse(decorator) for decorator in node.decorator_list]
    params = getattr(node, "type_params", None) or []
    name = node.name + ("[" + ", ".join(ast.unparse(param) for param in params) + "]" if params else "")
    bases = [ast.unparse(base) for base in node.bases] + [ast.unparse(keyword) for keyword in node.keywords]
    lines.append("class " + name + ("(" + ", ".join(bases) + ")" if bases else "") + ":")
    for item in node.body:
        if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)) and public_member(item.name):
            lines.append(signature(item))
        elif isinstance(item, ast.ClassDef) and public(item.name):
            lines.append(class_shape(item))
        elif isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name) and public_member(item.target.id):
            lines.append(item.target.id + ": " + ast.unparse(item.annotation) + (" = ..." if item.value is not None else ""))
        elif isinstance(item, ast.Assign):
            for target in item.targets:
                if isinstance(target, ast.Name) and public_member(target.id):
                    lines.append(target.id + " = ...")
    return "\n".join(lines)


def literal(value):
    """The source of a constant a value is written as, or None for anything else."""
    if isinstance(value, ast.Constant):
        return ast.unparse(value)
    if isinstance(value, ast.UnaryOp) and isinstance(value.op, ast.USub) and isinstance(value.operand, ast.Constant):
        return ast.unparse(value)
    return None


def names_of(target):
    if isinstance(target, ast.Name):
        return [target.id]
    if isinstance(target, (ast.Tuple, ast.List)):
        return [name for element in target.elts for name in names_of(element)]
    if isinstance(target, ast.Starred):
        return names_of(target.value)
    return []


def strings(value):
    """The strings of a list or tuple of string constants, as __all__ is written; None for anything else."""
    if not isinstance(value, (ast.List, ast.Tuple)):
        return None
    found = []
    for element in value.elts:
        if not (isinstance(element, ast.Constant) and isinstance(element.value, str)):
            return None
        found.append(element.value)
    return found


def is_main_guard(node):
    """Whether a statement is if __name__ == "__main__": in either order."""
    if not isinstance(node, ast.If) or not isinstance(node.test, ast.Compare) or len(node.test.ops) != 1:
        return False
    if not isinstance(node.test.ops[0], ast.Eq):
        return False
    sides = [node.test.left, node.test.comparators[0]]
    named = any(isinstance(side, ast.Name) and side.id == "__name__" for side in sides)
    main = any(isinstance(side, ast.Constant) and side.value == "__main__" for side in sides)
    return named and main


def module_statements(body):
    """The statements that run at module scope: the body, and the bodies of its if, try and with blocks."""
    for statement in body:
        yield statement
        if isinstance(statement, ast.If):
            yield from module_statements(statement.body)
            yield from module_statements(statement.orelse)
        elif isinstance(statement, (ast.Try, getattr(ast, "TryStar", ast.Try))):
            yield from module_statements(statement.body)
            for handler in statement.handlers:
                yield from module_statements(handler.body)
            yield from module_statements(statement.orelse)
            yield from module_statements(statement.finalbody)
        elif isinstance(statement, (ast.With, ast.AsyncWith)):
            yield from module_statements(statement.body)


def start_of(node):
    lines = [decorator.lineno for decorator in getattr(node, "decorator_list", [])]
    return min(lines + [node.lineno])


def read_file(root, path):
    out = {"path": path, "loc": 0, "imports": [], "decls": [], "all": None, "main_guard": False, "functions": [], "code": []}
    try:
        with open(os.path.join(root, path), "rb") as handle:
            source = handle.read()
    except OSError as error:
        out["error"] = str(error)
        return out
    out["loc"] = sum(1 for line in source.split(b"\n") if line.strip())
    try:
        tree = ast.parse(source, filename=path)
    except (SyntaxError, ValueError) as error:
        out["error"] = str(error)
        return out
    top = set()
    for statement in module_statements(tree.body):
        top.add(id(statement))
        if isinstance(statement, (ast.FunctionDef, ast.AsyncFunctionDef)):
            out["decls"].append({"name": statement.name, "shape": signature(statement) if public(statement.name) else None})
        elif isinstance(statement, ast.ClassDef):
            out["decls"].append({"name": statement.name, "shape": class_shape(statement) if public(statement.name) else None})
        elif isinstance(statement, ast.Assign):
            for target in statement.targets:
                for name in names_of(target):
                    if name == "__all__":
                        out["all"] = strings(statement.value)
                        continue
                    shown = literal(statement.value) if isinstance(target, ast.Name) else None
                    out["decls"].append({"name": name, "shape": None if shown is None else name + " = " + shown})
        elif isinstance(statement, ast.AugAssign) and isinstance(statement.target, ast.Name) and statement.target.id == "__all__":
            added = strings(statement.value)
            out["all"] = None if added is None or out["all"] is None else out["all"] + added
        elif isinstance(statement, ast.AnnAssign) and isinstance(statement.target, ast.Name):
            name = statement.target.id
            if name == "__all__":
                out["all"] = strings(statement.value) if statement.value is not None else None
                continue
            out["decls"].append({"name": name, "shape": name + ": " + ast.unparse(statement.annotation) + (" = ..." if statement.value is not None else "")})
        elif is_main_guard(statement):
            out["main_guard"] = True
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                out["imports"].append({"module": alias.name, "level": 0, "names": [], "bound": alias.asname or alias.name.split(".")[0], "line": node.lineno, "top": id(node) in top})
        elif isinstance(node, ast.ImportFrom):
            out["imports"].append({
                "module": node.module or "",
                "level": node.level or 0,
                "names": [{"name": alias.name, "bound": alias.asname or alias.name} for alias in node.names],
                "line": node.lineno,
                "top": id(node) in top,
            })
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            out["functions"].append({"name": node.name, "line": node.lineno, "line_count": node.end_lineno - node.lineno + 1})
    docstring = ast.get_docstring(tree, clean=False) is not None
    for index, statement in enumerate(tree.body):
        if isinstance(statement, (ast.Import, ast.ImportFrom)) or (index == 0 and docstring):
            continue
        out["code"].append({"start": start_of(statement), "end": statement.end_lineno})
    out["imports"].sort(key=lambda spec: (spec["line"], spec["module"]))
    out["functions"].sort(key=lambda fn: (fn["line"], fn["name"]))
    return out


def main():
    if len(sys.argv) != 2:
        sys.stderr.write("usage: python3 -I -S helper.py <root> < paths\n")
        return 2
    root = sys.argv[1]
    files = [read_file(root, path) for path in sys.stdin.read().split("\n") if path]
    json.dump(files, sys.stdout)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
`;

/* cspell:enable */
