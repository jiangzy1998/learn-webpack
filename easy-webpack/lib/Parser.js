const fs = require('fs');
const parser = require("@babel/parser");
const options = require("../webpack.config");
const path = require('path');
const traverse = require('@babel/traverse').default
const { transformFromAst } = require('@babel/core')


const Parser = {
    getAst:path=>{
        // 读取入口文件
        const content = fs.readFileSync(path, 'utf-8');
        return parser.parse(content, {
            sourceType:'module'
        })
    },
    getDependecies:(ast, filename) => {
        const dependecies = {}
        traverse(ast, {
            // 类型为 ImportDeclaration  的 AST 节点
            ImportDeclaration({node}){
                const dirname = path.dirname(filename);
                // 保存依赖模块路径，之后生成依赖关系图需要用到
                const filepath = "./" + path.join(dirname, node.source.value);
                dependecies[node.source.value] = filepath;
            }
        })
        return dependecies;
    },
    getCode: ast => {
        // 将 AST 转换为 code
        const { code } = transformFromAst(ast, null, {
            presets:["@babel/preset-env"]
        })
        return code;
    }
}

module.exports = Parser