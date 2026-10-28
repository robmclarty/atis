/**
 * go-helper: the Go program the Go producer runs with `go run` (D113, D139).
 *
 * It reads Go files with `go/parser` alone, never building, importing or
 * running them, and prints as JSON what each declares, with the shape of each
 * exported name printed bare (no body, no comment, no unexported field, no
 * layout), what it imports, the names it reads off each import, and the names
 * it leaves to the rest of its package. It ships as source inside atis's own
 * bundle (C9): the producer writes it into a directory of its own, outside the
 * reviewed tree, and runs it on the repo's own toolchain.
 */

/* cspell:disable */

/** The helper's module: its own, so the reviewed tree's `go.mod` never decides how it builds. */
export const GO_HELPER_MOD = String.raw`module atis.local/gohelper

go 1.18
`;

/** The helper's one source file. */
export const GO_HELPER_MAIN = String.raw`// The atis Go helper: reads Go files with go/parser alone, never builds or
// runs them, and prints what each declares, imports and uses as JSON.
//
//	go run . <root> < paths
package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"go/ast"
	"go/parser"
	"go/printer"
	"go/token"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type span struct {
	Start int "json:\"start\""
	End   int "json:\"end\""
}

type named struct {
	Name string "json:\"name\""
	Line int    "json:\"line\""
}

type importSpec struct {
	Path  string "json:\"path\""
	Alias string "json:\"alias\""
	Line  int    "json:\"line\""
}

type decl struct {
	Name     string  "json:\"name\""
	Exported bool    "json:\"exported\""
	Shape    *string "json:\"shape\""
	Receiver string  "json:\"receiver,omitempty\""
}

type use struct {
	Qualifier string "json:\"qualifier\""
	Name      string "json:\"name\""
	Line      int    "json:\"line\""
}

type function struct {
	Name      string "json:\"name\""
	Line      int    "json:\"line\""
	LineCount int    "json:\"line_count\""
}

type file struct {
	Path       string       "json:\"path\""
	Loc        int          "json:\"loc\""
	Package    string       "json:\"package\""
	Error      string       "json:\"error,omitempty\""
	Imports    []importSpec "json:\"imports\""
	Decls      []decl       "json:\"decls\""
	Uses       []use        "json:\"uses\""
	Unresolved []named      "json:\"unresolved\""
	Functions  []function   "json:\"functions\""
	Code       []span       "json:\"code\""
}

var fset = token.NewFileSet()

func line(pos token.Pos) int { return fset.Position(pos).Line }

// print writes a node with no comments, every line trimmed and its runs of
// spaces collapsed, blank lines dropped, so layout is no part of a shape.
func print(node interface{}) *string {
	var buf bytes.Buffer
	if err := printer.Fprint(&buf, fset, node); err != nil {
		return nil
	}
	var lines []string
	for _, raw := range strings.Split(buf.String(), "\n") {
		fields := strings.Fields(raw)
		if len(fields) > 0 {
			lines = append(lines, strings.Join(fields, " "))
		}
	}
	shape := strings.Join(lines, "\n")
	return &shape
}

// receiverName is the name of the type a method is declared on.
func receiverName(expr ast.Expr) string {
	switch t := expr.(type) {
	case *ast.StarExpr:
		return receiverName(t.X)
	case *ast.IndexExpr:
		return receiverName(t.X)
	case *ast.IndexListExpr:
		return receiverName(t.X)
	case *ast.ParenExpr:
		return receiverName(t.X)
	case *ast.Ident:
		return t.Name
	}
	return ""
}

func funcShape(fn *ast.FuncDecl) *string {
	bare := *fn
	bare.Doc = nil
	bare.Body = nil
	if fn.Recv != nil {
		fields := make([]*ast.Field, len(fn.Recv.List))
		for i, field := range fn.Recv.List {
			fields[i] = &ast.Field{Type: field.Type}
		}
		bare.Recv = &ast.FieldList{List: fields}
	}
	return print(&bare)
}

// exportedFields is a struct type with its unexported fields dropped, since
// no reader outside the package sees them.
func exportedFields(expr ast.Expr) ast.Expr {
	st, ok := expr.(*ast.StructType)
	if !ok || st.Fields == nil {
		return expr
	}
	var kept []*ast.Field
	for _, field := range st.Fields.List {
		if len(field.Names) == 0 {
			kept = append(kept, &ast.Field{Type: field.Type, Tag: field.Tag})
			continue
		}
		var names []*ast.Ident
		for _, name := range field.Names {
			if name.IsExported() {
				names = append(names, ast.NewIdent(name.Name))
			}
		}
		if len(names) > 0 {
			kept = append(kept, &ast.Field{Names: names, Type: field.Type, Tag: field.Tag})
		}
	}
	return &ast.StructType{Fields: &ast.FieldList{List: kept}}
}

func typeShape(spec *ast.TypeSpec) *string {
	bare := &ast.TypeSpec{Name: spec.Name, TypeParams: spec.TypeParams, Assign: spec.Assign, Type: exportedFields(spec.Type)}
	return print(&ast.GenDecl{Tok: token.TYPE, Specs: []ast.Spec{bare}})
}

// valueType is the type a value's own syntax names: a function literal's,
// a composite literal's, or a pointer to one; none for anything else.
func valueType(value ast.Expr) ast.Expr {
	switch v := value.(type) {
	case *ast.FuncLit:
		return v.Type
	case *ast.CompositeLit:
		return v.Type
	case *ast.UnaryExpr:
		if lit, ok := v.X.(*ast.CompositeLit); ok && v.Op == token.AND && lit.Type != nil {
			return &ast.StarExpr{X: lit.Type}
		}
	}
	return nil
}

// valueShape is "var Name Type" or "const Name Type" where the type is
// written or the value's syntax names it, "const Name = 1" for an untyped
// constant of one literal, and none where only the type checker could say.
func valueShape(tok token.Token, name string, typ ast.Expr, value ast.Expr) *string {
	if typ == nil && value != nil {
		typ = valueType(value)
	}
	keyword := tok.String()
	if typ != nil {
		if printed := print(typ); printed != nil {
			shape := keyword + " " + name + " " + *printed
			return &shape
		}
		return nil
	}
	if lit, ok := value.(*ast.BasicLit); ok && tok == token.CONST {
		shape := "const " + name + " = " + lit.Value
		return &shape
	}
	return nil
}

func readFile(root, path string) file {
	out := file{Path: path, Imports: []importSpec{}, Decls: []decl{}, Uses: []use{}, Unresolved: []named{}, Functions: []function{}, Code: []span{}}
	src, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(path)))
	if err != nil {
		out.Error = err.Error()
		return out
	}
	for _, raw := range strings.Split(string(src), "\n") {
		if strings.TrimSpace(raw) != "" {
			out.Loc++
		}
	}
	f, err := parser.ParseFile(fset, path, src, 0)
	if err != nil {
		out.Error = err.Error()
	}
	if f == nil {
		return out
	}
	out.Package = f.Name.Name
	for _, spec := range f.Imports {
		alias := ""
		if spec.Name != nil {
			alias = spec.Name.Name
		}
		path, err := strconv.Unquote(spec.Path.Value)
		if err != nil {
			continue
		}
		out.Imports = append(out.Imports, importSpec{Path: path, Alias: alias, Line: line(spec.Pos())})
	}
	addFunction := func(name string, node ast.Node) {
		start, end := line(node.Pos()), line(node.End())
		out.Functions = append(out.Functions, function{Name: name, Line: start, LineCount: end - start + 1})
	}
	for _, d := range f.Decls {
		switch d := d.(type) {
		case *ast.FuncDecl:
			name := d.Name.Name
			receiver := ""
			if d.Recv != nil && len(d.Recv.List) > 0 {
				receiver = receiverName(d.Recv.List[0].Type)
				name = receiver + "." + name
			} else if name == "init" || name == "_" {
				if d.Body != nil {
					addFunction(name, d)
					out.Code = append(out.Code, span{line(d.Pos()), line(d.End())})
				}
				continue
			}
			exported := d.Name.IsExported() && (receiver == "" || ast.IsExported(receiver))
			var shape *string
			if exported {
				shape = funcShape(d)
			}
			out.Decls = append(out.Decls, decl{Name: name, Exported: exported, Shape: shape, Receiver: receiver})
			if d.Body != nil {
				addFunction(name, d)
				out.Code = append(out.Code, span{line(d.Pos()), line(d.End())})
			}
		case *ast.GenDecl:
			if d.Tok == token.IMPORT {
				continue
			}
			valued := false
			var lastType ast.Expr
			for _, spec := range d.Specs {
				switch s := spec.(type) {
				case *ast.TypeSpec:
					var shape *string
					if s.Name.IsExported() {
						shape = typeShape(s)
					}
					out.Decls = append(out.Decls, decl{Name: s.Name.Name, Exported: s.Name.IsExported(), Shape: shape})
				case *ast.ValueSpec:
					typ, values := s.Type, s.Values
					if d.Tok == token.CONST && typ == nil && len(values) == 0 {
						// A constant with neither a type nor a value repeats the type above it.
						typ = lastType
					} else {
						lastType = typ
					}
					if len(s.Values) > 0 {
						valued = true
					}
					for i, ident := range s.Names {
						if ident.Name == "_" {
							continue
						}
						var value ast.Expr
						if i < len(values) {
							value = values[i]
						}
						var shape *string
						if ident.IsExported() {
							shape = valueShape(d.Tok, ident.Name, typ, value)
						}
						out.Decls = append(out.Decls, decl{Name: ident.Name, Exported: ident.IsExported(), Shape: shape})
						if lit, ok := value.(*ast.FuncLit); ok && d.Tok == token.VAR {
							addFunction(ident.Name, lit)
						}
					}
				}
			}
			if valued && d.Tok == token.VAR {
				out.Code = append(out.Code, span{line(d.Pos()), line(d.End())})
			}
		}
	}
	seen := map[string]bool{}
	ast.Inspect(f, func(node ast.Node) bool {
		sel, ok := node.(*ast.SelectorExpr)
		if !ok {
			return true
		}
		if x, ok := sel.X.(*ast.Ident); ok && x.Obj == nil {
			key := x.Name + "." + sel.Sel.Name
			if !seen[key] {
				seen[key] = true
				out.Uses = append(out.Uses, use{Qualifier: x.Name, Name: sel.Sel.Name, Line: line(sel.Pos())})
			}
		}
		return true
	})
	unresolved := map[string]bool{}
	for _, ident := range f.Unresolved {
		if !unresolved[ident.Name] {
			unresolved[ident.Name] = true
			out.Unresolved = append(out.Unresolved, named{Name: ident.Name, Line: line(ident.Pos())})
		}
	}
	return out
}

func main() {
	if len(os.Args) != 2 {
		os.Stderr.WriteString("usage: go run . <root> < paths\n")
		os.Exit(2)
	}
	root := os.Args[1]
	files := []file{}
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Buffer(make([]byte, 1024*1024), 64*1024*1024)
	for scanner.Scan() {
		if path := scanner.Text(); path != "" {
			files = append(files, readFile(root, path))
		}
	}
	if err := json.NewEncoder(os.Stdout).Encode(files); err != nil {
		os.Stderr.WriteString(err.Error() + "\n")
		os.Exit(1)
	}
}
`;

/* cspell:enable */
