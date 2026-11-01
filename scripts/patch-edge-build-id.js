const fs = require("fs");

const file = ".next/server/edge/chunks/[root-of-the-server]__0nhj1sx._.js";
let source = fs.readFileSync(file, "utf8");
const before = source;
source = source.replace("process.env.__NEXT_BUILD_ID", '""');
source = source.replaceAll("e.buildId=g||e.buildId,", "");

if (source === before) {
  console.log("edge build id patch: already applied or target not found");
} else {
  fs.writeFileSync(file, source);
  console.log("edge build id patch: applied");
}
