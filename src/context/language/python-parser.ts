import { AbstractParser, EnclosingContext } from "../../constants";
import * as pythonParser from "python-ast";

const processNode = (
  node: any,
  lineStart: number,
  lineEnd: number,
  largestSize: number,
  largestEnclosingContext: any | null
) => {
  const start = node.lineno;
  const end = node.end_lineno || node.lineno;
  
  if (start <= lineStart && lineEnd <= end) {
    const size = end - start;
    if (size > largestSize) {
      largestSize = size;
      largestEnclosingContext = node;
    }
  }
  return { largestSize, largestEnclosingContext };
};

export class PythonParser implements AbstractParser {
  findEnclosingContext(
    file: string,
    lineStart: number,
    lineEnd: number
  ): EnclosingContext {
    const ast = pythonParser.parse(file);
    let largestEnclosingContext: any = null;
    let largestSize = 0;

    const visitNode = (node: any) => {
      // Process function definitions and class definitions
      if (node.type === 'FunctionDef' || node.type === 'ClassDef') {
        ({ largestSize, largestEnclosingContext } = processNode(
          node,
          lineStart,
          lineEnd,
          largestSize,
          largestEnclosingContext
        ));
      }

      // Recursively visit child nodes
      for (const child of Object.values(node)) {
        if (Array.isArray(child)) {
          child.forEach(n => {
            if (n && typeof n === 'object' && 'type' in n) {
              visitNode(n);
            }
          });
        } else if (child && typeof child === 'object' && 'type' in child) {
          visitNode(child);
        }
      }
    };

    visitNode(ast);
    
    return {
      enclosingContext: largestEnclosingContext,
    } as EnclosingContext;
  }

  dryRun(file: string): { valid: boolean; error: string } {
    try {
      pythonParser.parse(file);
      return {
        valid: true,
        error: "",
      };
    } catch (exc) {
      return {
        valid: false,
        error: exc.toString(),
      };
    }
  }
}
