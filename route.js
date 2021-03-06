const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const mime = require('mime');
const compress = require('./tools/compress');
const isCacheValid = require('./tools/isCacheValid')
const  { promises: promisesFs } = fs;

module.exports = async function(req, res, filePath, root) {
    try {
        const stats = await promisesFs.stat(filePath);
        if (stats.isFile()) {
            console.log(chalk.yellow('当前是文件'));
            if (isCacheValid(stats, req, res)) {
                res.statusCode = 304;
                res.end();
                return;
            }
            res.statusCode = 200;
            const mimeType = mime.getType(path.extname(filePath));
            res.setHeader('Content-Type', `${mimeType};charset=utf-8;`);
            let rs = fs.createReadStream(filePath);
            rs = compress(rs, req, res); // 开启gzip压缩，package-lock.json: 43.5KB => 8.8KB
            rs.pipe(res); // s用createStream比readFile好
        } else if (stats.isDirectory()) {
            console.log(chalk.yellow('当前是文件夹'));
            fs.readdir(filePath, (err, files) => {
                if (err) {
                    console.error(err);
                    res.end(err.toString());
                    return;
                }
                const tplPath = path.join(__dirname, 'template/index.html');
                const tplStr = fs.readFileSync(tplPath).toString(); //TODO: 异步
                res.statusCode = 200;
                res.setHeader('content-type', 'text/html');
                const dir = path.relative(root || process.cwd(), filePath); // 相对于根目录的路径这个文件的路径；process.cwd()返回当前工作目录。如：调用node命令执行脚本时的目录
                const html = ejs.render(tplStr, {
                    files,
                    dir: path.join('../', dir) 
                });
                res.end(html);
            });
        }
    } catch (err) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        console.error(chalk.red(err.toString()))
        res.end(err.toString());
    }
};