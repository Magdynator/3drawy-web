const fs = require('fs');
let code = fs.readFileSync('/home/magdy/Desktop/adrawya/src/pages/quiz/QuizLeaderboardPage.tsx', 'utf8');

// Find the premature closing block (</div> ) })
// We will replace it with empty so the component stays open.
code = code.replace(/\n\s*\}\)\n\s*\}\n*\{\/\* Bottom Actions - Drop from Top \*\/\s*\}/, "\n\n{/* Bottom Actions - Drop from Top */ }");

// And replace the extra </div> ) } we added at the end which are broken:
// Actually, let's just do a clean regex replacement.
// The easiest way is to let me read the file and write a proper script or use multi_replace.
