const Parser = require("./Parser")
const options = require("../webpack.config");
const path = require("path");
const fs = require("fs");

class Compiler {
    constructor(options) {
        // webpack配置
        const { entry, output } = options;
        // 入口
        this.entry = entry;
        // 出口
        this.output = output;
        // 模块
        this.modules = [];
    }

    // 构建启动
    run() {
        // 解析入口文件
        const info = this.build(this.entry);
        this.modules.push(info);
        this.modules.forEach(({ dependecies }) => {
            if (dependecies) {
                for (const dependency in dependecies) {
                    this.modules.push(this.build(dependecies[dependency]));
                }
            }
        });

        const dependencyGraph = this.modules.reduce(
            (graph, item) => ({
                ...graph,
                // 使用文件路径作为每个模块的唯一标识符，保存对应模块的依赖对象的文件内容
                [item.filename]: {
                    dependecies: item.dependecies,
                    code: item.code
                }
            }),
            {}
        );

        this.generate(dependencyGraph);
    }

    build(filename) {
        const { getAst, getDependecies, getCode } = Parser;
        const ast = getAst(filename);
        const dependecies = getDependecies(ast, filename);
        const code = getCode(ast);
        return {
            // 文件路径,可以作为每个模块的唯一标识符
            filename,
            // 依赖对象，保存着依赖模块路径
            dependecies,
            // 文件内容
            code
        }
    }
    // 重写 require 函数（浏览器不能识别 commonjs 语法 ），输出 bundle
    generate(code) {
        const filePath = path.join(this.output.path, this.output.filename);
        const bundle = `(function(graph){
            function require(module){
              function localRequire(relativePath){
                return require(graph[module].dependecies[relativePath])
              }
              var exports = {};
              (function(require,exports,code){
                eval(code)
              })(localRequire,exports,graph[module].code);
              return exports;
            }
            require('${this.entry}')
          })(${JSON.stringify(code)})`;
        
        // 把文件内容写入到文件系统
        fs.writeFileSync(filePath, bundle, "utf-8");   
    }
}

module.exports = Compiler;

// new Compiler(options).run();

// // 定义一个立即执行函数，传入生成的依赖关系图
// (function (graph) {
//     // 重写 require 函数
//     function require(moduleId){
//         // 找到对应 moduleId 的依赖对象，调用 require 函数，eval 执行，拿到 exports 对象
//         function localRequire(relativePath){
//             return require(graph[moduleId].dependecies[relativePath])
//         }
//         var exports = {};
//         (function(require, exports, code){
//             // commonjs 语法使用 module.exports 暴露实现，我们传入的 exports 对象会捕获依赖对象（hello.js）暴露的实现(exports.say = say)并写入
//             eval(code)
//         })(localRequire, exports, graph[moduleId].code);
//         return exports;
//     }
//     require("./src/index.js")
// })({
//     './src/index.js': {
//         dependecies: { './hello.js': './src/hello.js' },
//         code: '"use strict";\n\nvar _hello = require("./hello.js");\n\ndocument.write((0, _hello.say)("webpack"));'
//     },
//     './src/hello.js': {
//         dependecies: {},
//         code:
//             '"use strict";\n\nObject.defineProperty(exports, "__esModule", {\n  value: true\n});\nexports.say = say;\n\nfunction say(name) {\n  return "hello ".concat(name);\n}'
//     }
// })