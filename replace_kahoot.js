const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "src");

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            results.push(file);
        }
    });
    return results;
}

const files = walk(SRC_DIR);
let modifiedCount = 0;

files.forEach(file => {
    if (!file.endsWith(".tsx") && !file.endsWith(".ts") && !file.endsWith(".css")) return;

    let content = fs.readFileSync(file, "utf8");
    const originalContent = content;

    // Replace lowercase 'kahoot' with 'zingoo' (for CSS classes like bg-kahoot-purple)
    content = content.replace(/kahoot/g, "zingoo");

    // Replace capitalized 'Kahoot' with 'Zingoo' (for UI text)
    content = content.replace(/Kahoot/g, "Zingoo");

    // Replace uppercase 'KAHOOT' with 'ZINGOO'
    content = content.replace(/KAHOOT/g, "ZINGOO");

    if (content !== originalContent) {
        fs.writeFileSync(file, content, "utf8");
        console.log(`Updated: ${file}`);
        modifiedCount++;
    }
});

console.log(`Replaced in ${modifiedCount} files.`);
